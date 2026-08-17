jest.mock('../models/Business', () => ({
  countDocuments: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  create: jest.fn()
}));

jest.mock('../models/Review', () => ({
  findOneAndUpdate: jest.fn(),
  aggregate: jest.fn(),
  find: jest.fn()
}));

jest.mock('../models/Order', () => ({
  create: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  aggregate: jest.fn()
}));

jest.mock('../utils/messageSendHelpers', () => ({
  isEitherUserBlocked: jest.fn().mockResolvedValue(false)
}));

jest.mock('../utils/contentFilter', () => ({
  containsProfanity: jest.fn().mockReturnValue(false)
}));

const mongoose = require('mongoose');
const Business = require('../models/Business');
const Review = require('../models/Review');
const Order = require('../models/Order');
const winga = require('../controllers/wingaController');

const BIZ_ID = new mongoose.Types.ObjectId();
const OTHER_ID = new mongoose.Types.ObjectId();
const MY_ID = new mongoose.Types.ObjectId();

const makeRes = () => {
  const res = { statusCode: 200 };
  res.status = jest.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn((body) => {
    res.body = body;
    return res;
  });
  return res;
};

const makeReq = (overrides = {}) => ({
  body: {},
  params: {},
  app: { get: jest.fn().mockReturnValue(null) },
  user: { _id: 'user-1', username: 'alice', phoneNumber: '+255700000000' },
  ...overrides
});

describe('wingaController', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects a listing when the 15-per-day limit is reached', async () => {
    Business.countDocuments.mockResolvedValue(15);
    const res = makeRes();
    await winga.createBusiness(makeReq({
      body: { category: 'nguo', title: 'Mkoba', media: [{ url: '/uploads/winga/a.jpg', type: 'image' }] }
    }), res);
    expect(res.statusCode).toBe(429);
    expect(res.body.code).toBe('DAILY_LIMIT_REACHED');
    expect(res.body.limit).toBe(15);
  });

  it('creates a listing with media when under the limit', async () => {
    Business.countDocuments.mockResolvedValue(3);
    const listing = {
      _id: BIZ_ID,
      userId: 'user-1',
      username: 'alice',
      sellerPhone: '+255700000000',
      category: 'nguo',
      title: 'Mkoba',
      media: [{ url: '/uploads/winga/a.jpg', type: 'image' }],
      views: [],
      toObject: () => ({
        _id: BIZ_ID, userId: 'user-1', username: 'alice', sellerPhone: '+255700000000',
        category: 'nguo', title: 'Mkoba', description: '', price: 0, location: '',
        media: [{ url: '/uploads/winga/a.jpg', type: 'image' }], views: [], viewsCount: 0,
        createdAt: new Date()
      })
    };
    Business.create.mockResolvedValue(listing);
    Business.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue(listing)
    });
    const res = makeRes();
    await winga.createBusiness(makeReq({
      user: { _id: MY_ID, username: 'alice', phoneNumber: '+255700000000' },
      body: { category: 'nguo', title: 'Mkoba', price: 50000, media: [{ url: '/uploads/winga/a.jpg', type: 'image' }] }
    }), res);
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.postedToday).toBe(4);
  });

  it('requires a title', async () => {
    Business.countDocuments.mockResolvedValue(0);
    const res = makeRes();
    await winga.createBusiness(makeReq({
      body: { category: 'nguo', media: [{ url: '/uploads/winga/a.jpg', type: 'image' }] }
    }), res);
    expect(res.statusCode).toBe(400);
  });

  it('requires at least one media item', async () => {
    Business.countDocuments.mockResolvedValue(0);
    const res = makeRes();
    await winga.createBusiness(makeReq({ body: { category: 'nguo', title: 'Mkoba' } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('marks a listing as viewed by a non-owner', async () => {
    const listing = {
      _id: BIZ_ID,
      userId: String(OTHER_ID),
      views: [],
      viewsCount: 0,
      save: jest.fn().mockResolvedValue(undefined)
    };
    Business.findById.mockResolvedValue(listing);
    const res = makeRes();
    await winga.viewBusiness(makeReq({
      user: { _id: MY_ID, username: 'alice' },
      params: { id: String(BIZ_ID) }
    }), res);
    expect(res.body.success).toBe(true);
    expect(listing.views.length).toBe(1);
    expect(String(listing.views[0].user)).toBe(String(MY_ID));
    expect(listing.viewsCount).toBe(1);
  });

  it('does not double-count a repeat view', async () => {
    const listing = {
      _id: BIZ_ID,
      userId: String(OTHER_ID),
      views: [{ user: MY_ID, viewedAt: new Date() }],
      viewsCount: 1,
      save: jest.fn().mockResolvedValue(undefined)
    };
    Business.findById.mockResolvedValue(listing);
    const res = makeRes();
    await winga.viewBusiness(makeReq({
      user: { _id: MY_ID, username: 'alice' },
      params: { id: String(BIZ_ID) }
    }), res);
    expect(listing.views.length).toBe(1);
    expect(listing.save).not.toHaveBeenCalled();
  });

  it('forbids deleting someone else\'s listing', async () => {
    Business.findById.mockResolvedValue({ _id: BIZ_ID, userId: String(OTHER_ID), deleteOne: jest.fn() });
    const res = makeRes();
    await winga.deleteBusiness(makeReq({ params: { id: String(BIZ_ID) } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('lets the owner delete their listing', async () => {
    const listing = { _id: BIZ_ID, userId: 'user-1', deleteOne: jest.fn().mockResolvedValue(undefined) };
    Business.findById.mockResolvedValue(listing);
    const res = makeRes();
    await winga.deleteBusiness(makeReq({ params: { id: String(BIZ_ID) } }), res);
    expect(res.body.success).toBe(true);
    expect(listing.deleteOne).toHaveBeenCalled();
  });

  it('rejects a rating outside 1–5', async () => {
    Business.findById.mockResolvedValue({ _id: BIZ_ID, userId: String(OTHER_ID) });
    const res = makeRes();
    await winga.rateBusiness(makeReq({
      user: { _id: MY_ID, username: 'alice' },
      params: { id: String(BIZ_ID) },
      body: { rating: 9, comment: 'wow' }
    }), res);
    expect(res.statusCode).toBe(400);
  });

  it('forbids rating your own listing', async () => {
    Business.findById.mockResolvedValue({ _id: BIZ_ID, userId: String(MY_ID) });
    const res = makeRes();
    await winga.rateBusiness(makeReq({
      user: { _id: MY_ID, username: 'alice' },
      params: { id: String(BIZ_ID) },
      body: { rating: 5, comment: 'great' }
    }), res);
    expect(res.statusCode).toBe(400);
  });

  it('upserts a rating and returns the summary', async () => {
    Business.findById.mockResolvedValue({ _id: BIZ_ID, userId: String(OTHER_ID) });
    Review.findOneAndUpdate.mockResolvedValue({ _id: 'rev-1' });
    Review.aggregate.mockResolvedValue([{ avg: 4.5, count: 2 }]);
    const res = makeRes();
    await winga.rateBusiness(makeReq({
      user: { _id: MY_ID, username: 'alice' },
      params: { id: String(BIZ_ID) },
      body: { rating: 4, comment: 'nzuri sana' }
    }), res);
    expect(res.body.success).toBe(true);
    expect(Review.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ listing: BIZ_ID, user: String(MY_ID) }),
      expect.objectContaining({ rating: 4 }),
      expect.objectContaining({ upsert: true })
    );
    expect(res.body.ratingSummary).toEqual({ avg: 4.5, count: 2 });
  });

  it('lists reviews for a listing with mine flag', async () => {
    Review.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue([
          { _id: 'r1', userId: String(OTHER_ID), username: 'bob', rating: 5, comment: 'kabisa', createdAt: new Date() },
          { _id: 'r2', userId: String(MY_ID), username: 'alice', rating: 4, comment: '', createdAt: new Date() }
        ])
      })
    });
    const res = makeRes();
    await winga.getReviews(makeReq({
      user: { _id: MY_ID, username: 'alice' },
      params: { id: String(BIZ_ID) }
    }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.reviews.length).toBe(2);
    expect(res.body.reviews[0].mine).toBe(false);
    expect(res.body.reviews[1].mine).toBe(true);
  });

  it('places an order on a listing as a buyer', async () => {
    Business.findById.mockResolvedValue({
      _id: BIZ_ID,
      userId: String(OTHER_ID),
      title: 'Mkoba',
      price: 50000,
      priceText: '',
      category: 'nguo',
      media: [{ url: '/uploads/winga/a.jpg', type: 'image' }],
      isSold: false
    });
    const order = {
      _id: 'order-1',
      listing: BIZ_ID,
      buyerId: String(MY_ID),
      sellerId: String(OTHER_ID),
      status: 'pending',
      toObject: () => ({ _id: 'order-1', buyerId: String(MY_ID), sellerId: String(OTHER_ID), status: 'pending' })
    };
    Order.create.mockResolvedValue(order);
    const res = makeRes();
    await winga.placeOrder(makeReq({
      user: { _id: MY_ID, username: 'alice' },
      params: { id: String(BIZ_ID) },
      body: { quantity: 2, message: 'Naomba mkoba huu' }
    }), res);
    expect(res.statusCode).toBe(201);
    expect(Order.create).toHaveBeenCalledWith(expect.objectContaining({
      listing: BIZ_ID,
      buyerId: String(MY_ID),
      sellerId: String(OTHER_ID),
      quantity: 2,
      message: 'Naomba mkoba huu'
    }));
  });

  it('rejects an order on a sold listing', async () => {
    Business.findById.mockResolvedValue({ _id: BIZ_ID, userId: String(OTHER_ID), title: 'X', isSold: true });
    const res = makeRes();
    await winga.placeOrder(makeReq({
      user: { _id: MY_ID, username: 'alice' },
      params: { id: String(BIZ_ID) }
    }), res);
    expect(res.statusCode).toBe(400);
    expect(Order.create).not.toHaveBeenCalled();
  });

  it('forbids ordering your own listing', async () => {
    Business.findById.mockResolvedValue({ _id: BIZ_ID, userId: String(MY_ID), title: 'X', isSold: false });
    const res = makeRes();
    await winga.placeOrder(makeReq({
      user: { _id: MY_ID, username: 'alice' },
      params: { id: String(BIZ_ID) }
    }), res);
    expect(res.statusCode).toBe(400);
  });

  it('lets the seller confirm an order and marks the listing sold', async () => {
    const ORDER_ID = new mongoose.Types.ObjectId();
    const order = {
      _id: ORDER_ID,
      buyerId: String(MY_ID),
      sellerId: String(OTHER_ID),
      status: 'pending',
      listing: BIZ_ID,
      save: jest.fn().mockResolvedValue(undefined),
      toObject: () => ({ _id: String(ORDER_ID), status: 'confirmed' })
    };
    Order.findById.mockResolvedValue(order);
    const listing = { _id: BIZ_ID, isSold: false, save: jest.fn().mockResolvedValue(undefined) };
    Business.findById.mockResolvedValue(listing);
    const res = makeRes();
    await winga.updateOrderStatus(makeReq({
      user: { _id: OTHER_ID, username: 'bob' },
      params: { orderId: String(ORDER_ID) },
      body: { status: 'confirmed' }
    }), res);
    expect(res.body.success).toBe(true);
    expect(order.status).toBe('confirmed');
    expect(listing.isSold).toBe(true);
    expect(listing.save).toHaveBeenCalled();
  });

  it('lets the buyer cancel their own pending order', async () => {
    const ORDER_ID = new mongoose.Types.ObjectId();
    const order = {
      _id: ORDER_ID,
      buyerId: String(MY_ID),
      sellerId: String(OTHER_ID),
      status: 'pending',
      save: jest.fn().mockResolvedValue(undefined),
      toObject: () => ({ _id: String(ORDER_ID), status: 'cancelled' })
    };
    Order.findById.mockResolvedValue(order);
    const res = makeRes();
    await winga.updateOrderStatus(makeReq({
      user: { _id: MY_ID, username: 'alice' },
      params: { orderId: String(ORDER_ID) },
      body: { status: 'cancelled' }
    }), res);
    expect(res.body.success).toBe(true);
    expect(order.status).toBe('cancelled');
  });

  it('lets the buyer mark a confirmed order as completed', async () => {
    const ORDER_ID = new mongoose.Types.ObjectId();
    const order = {
      _id: ORDER_ID,
      buyerId: String(MY_ID),
      sellerId: String(OTHER_ID),
      status: 'confirmed',
      save: jest.fn().mockResolvedValue(undefined),
      toObject: () => ({ _id: String(ORDER_ID), status: 'completed' })
    };
    Order.findById.mockResolvedValue(order);
    const res = makeRes();
    await winga.updateOrderStatus(makeReq({
      user: { _id: MY_ID, username: 'alice' },
      params: { orderId: String(ORDER_ID) },
      body: { status: 'completed' }
    }), res);
    expect(res.body.success).toBe(true);
    expect(order.status).toBe('completed');
    expect(order.completedAt).toBeInstanceOf(Date);
  });

  it('forbids completing an order that is not confirmed yet', async () => {
    const ORDER_ID = new mongoose.Types.ObjectId();
    const order = {
      _id: ORDER_ID,
      buyerId: String(MY_ID),
      sellerId: String(OTHER_ID),
      status: 'pending',
      save: jest.fn()
    };
    Order.findById.mockResolvedValue(order);
    const res = makeRes();
    await winga.updateOrderStatus(makeReq({
      user: { _id: MY_ID, username: 'alice' },
      params: { orderId: String(ORDER_ID) },
      body: { status: 'completed' }
    }), res);
    expect(res.statusCode).toBe(400);
    expect(order.save).not.toHaveBeenCalled();
  });

  it('forbids the seller from completing the order (buyer only)', async () => {
    const ORDER_ID = new mongoose.Types.ObjectId();
    const order = {
      _id: ORDER_ID,
      buyerId: String(MY_ID),
      sellerId: String(OTHER_ID),
      status: 'confirmed',
      save: jest.fn()
    };
    Order.findById.mockResolvedValue(order);
    const res = makeRes();
    await winga.updateOrderStatus(makeReq({
      user: { _id: OTHER_ID, username: 'bob' },
      params: { orderId: String(ORDER_ID) },
      body: { status: 'completed' }
    }), res);
    expect(res.statusCode).toBe(403);
    expect(order.save).not.toHaveBeenCalled();
  });

  it('forbids the buyer from confirming their own order', async () => {
    const ORDER_ID = new mongoose.Types.ObjectId();
    const order = {
      _id: ORDER_ID,
      buyerId: String(MY_ID),
      sellerId: String(OTHER_ID),
      status: 'pending',
      save: jest.fn()
    };
    Order.findById.mockResolvedValue(order);
    const res = makeRes();
    await winga.updateOrderStatus(makeReq({
      user: { _id: MY_ID, username: 'alice' },
      params: { orderId: String(ORDER_ID) },
      body: { status: 'confirmed' }
    }), res);
    expect(res.statusCode).toBe(403);
    expect(order.save).not.toHaveBeenCalled();
  });

  it('returns seller stats with views, orders and ratings', async () => {
    Business.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue([
        {
          _id: BIZ_ID,
          userId: String(MY_ID),
          username: 'alice',
          title: 'Mkoba',
          viewsCount: 7,
          views: [],
          category: 'nguo',
          media: [],
          createdAt: new Date(),
          toObject() {
            return {
              _id: this._id, userId: this.userId, username: this.username,
              title: this.title, viewsCount: this.viewsCount, views: this.views,
              category: this.category, media: this.media, createdAt: this.createdAt
            };
          }
        }
      ])
    });
    Order.aggregate.mockResolvedValue([{ _id: BIZ_ID, total: 3, pending: 1, confirmed: 1, declined: 0, cancelled: 1 }]);
    Review.aggregate.mockResolvedValue([{ _id: BIZ_ID, avg: 4.5, count: 2 }]);
    const res = makeRes();
    await winga.getWingaStats(makeReq({ user: { _id: MY_ID, username: 'alice' } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.stats[0].viewsCount).toBe(7);
    expect(res.body.stats[0].orders.pending).toBe(1);
    expect(res.body.stats[0].ratingSummary).toEqual({ avg: 4.5, count: 2 });
    expect(res.body.totals.views).toBe(7);
    expect(res.body.totals.avgRating).toBe(4.5);
  });

  it('groups listings by category with unseen counts', async () => {
    const makeListing = (id, userId, viewedByMe) => ({
      _id: id,
      userId,
      username: 'x',
      category: 'simu',
      title: 'iPhone',
      media: [],
      views: viewedByMe ? [{ user: MY_ID }] : [],
      viewsCount: viewedByMe ? 1 : 0,
      createdAt: new Date(),
      toObject() {
        return {
          _id: this._id, userId: this.userId, username: this.username,
          category: this.category, title: this.title, description: '', price: 0,
          location: '', media: this.media, views: this.views, viewsCount: this.viewsCount,
          createdAt: this.createdAt
        };
      }
    });
    Business.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue([
          makeListing(new mongoose.Types.ObjectId(), String(OTHER_ID), false),
          makeListing(new mongoose.Types.ObjectId(), String(OTHER_ID), true),
          makeListing(new mongoose.Types.ObjectId(), String(MY_ID), false)
        ])
      })
    });
    Business.countDocuments.mockResolvedValue(1);
    Review.aggregate.mockResolvedValue([]);
    const res = makeRes();
    await winga.getBusinesses(makeReq({ user: { _id: MY_ID, username: 'alice' } }), res);
    expect(res.body.success).toBe(true);
    const simu = res.body.categories.find((c) => c.id === 'simu');
    expect(simu.count).toBe(3); // includes my own listing
    expect(simu.unseen).toBe(1);
    expect(res.body.totalUnseen).toBe(1);
    expect(res.body.myListings.length).toBe(1);
  });
});
