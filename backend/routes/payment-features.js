const express = require('express');
const router = express.Router();
const PaymentFeature = require('../models/PaymentFeature');
const { protect, isAdmin } = require('../middleware/auth');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');

// Create new payment feature (admin only)
router.post('/', protect, isAdmin, async (req, res) => {
  try {
    const { name, description, price, location, category, maxPrice, status, contactInfo, tags, specifications, isPrivate, expiresAt } = req.body;

    if (!name || !description || !price || !location || !maxPrice) {
      return res.status(400).json({
        success: false,
        message: 'Jina, maelezo, bei, sehemu na maximum bei lazima lipatikane'
      });
    }

    let images = [];
    if (req.files && req.files.images) {
      for (const file of req.files.images) {
        const result = await uploadToCloudinary(file.path, {
          folder: 'payment-features/images',
          transformation: [{ width: 1200, quality: 'auto' }]
        });
        images.push({
          url: result.secure_url,
          publicId: result.public_id,
          alt: name
        });
      }
    }

    let videos = [];
    if (req.files && req.files.videos) {
      for (const file of req.files.videos) {
        const result = await uploadToCloudinary(file.path, {
          folder: 'payment-features/videos',
          resource_type: 'video',
          transformation: [{ quality: 'auto', duration: 30 }]
        });
        videos.push({
          url: result.secure_url,
          publicId: result.public_id,
          title: name
        });
      }
    }

    const parsedContactInfo = contactInfo ? JSON.parse(contactInfo) : {};
    const parsedTags = tags ? JSON.parse(tags).filter(tag => tag.trim()) : [];
    const parsedSpecifications = specifications ? JSON.parse(specifications) : {};

    const paymentFeature = new PaymentFeature({
      name,
      description,
      price: parseFloat(price),
      location,
      category,
      maxPrice: parseFloat(maxPrice),
      images,
      videos,
      contactInfo: parsedContactInfo,
      tags: parsedTags,
      specifications: parsedSpecifications,
      isPrivate: isPrivate === 'true' || isPrivate === true,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdBy: req.user._id,
      status: status || 'pending'
    });

    await paymentFeature.save();

    res.status(201).json({
      success: true,
      message: 'Feature ya kulipa imesajiliwa kikamilifu',
      data: paymentFeature
    });

  } catch (error) {
    console.error('Error creating payment feature:', error);
    res.status(500).json({
      success: false,
      message: 'Hitilafu za ndani ya seva wakati wa kuunda feature',
      error: error.message
    });
  }
});

// Get all payment features (public)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = { status: 'active' };
    
    if (req.query.featured === 'true') {
      filter.featured = true;
    }

    const total = await PaymentFeature.countDocuments(filter);
    const paymentFeatures = await PaymentFeature.find(filter)
      .populate('createdBy', 'username profilePicture')
      .sort({ featured: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      count: paymentFeatures.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      data: paymentFeatures
    });

  } catch (error) {
    console.error('Error fetching payment features:', error);
    res.status(500).json({
      success: false,
      message: 'Hitilafu wakati wa kupata features',
      error: error.message
    });
  }
});

// Get single payment feature by ID
router.get('/:id', async (req, res) => {
  try {
    const paymentFeature = await PaymentFeature.findById(req.params.id)
      .populate('createdBy', 'username profilePicture bio')
      .populate('approvedBy', 'username profilePicture');

    if (!paymentFeature) {
      return res.status(404).json({
        success: false,
        message: 'Feature haijakutwa'
      });
    }

    if (paymentFeature.status !== 'active' && paymentFeature.createdBy._id.toString() !== req.user?._id) {
      return res.status(404).json({
        success: false,
        message: 'Feature haijakutwa'
      });
    }

    await paymentFeature.incrementViews();

    res.json({
      success: true,
      data: paymentFeature
    });

  } catch (error) {
    console.error('Error fetching payment feature:', error);
    res.status(500).json({
      success: false,
      message: 'Hitilafu wakati wa kupata feature',
      error: error.message
    });
  }
});

// Update payment feature (admin or owner)
router.put('/:id', protect, async (req, res) => {
  try {
    let paymentFeature = await PaymentFeature.findById(req.params.id);

    if (!paymentFeature) {
      return res.status(404).json({
        success: false,
        message: 'Feature haijakutwa'
      });
    }

    if (paymentFeature.createdBy.toString() !== req.user._id && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Hakuna ruhusa kugeuza feature hii'
      });
    }

    const updateData = { ...req.body };

    if (req.body.price) updateData.price = parseFloat(req.body.price);
    if (req.body.maxPrice) updateData.maxPrice = parseFloat(req.body.maxPrice);
    if (req.body.expiresAt) updateData.expiresAt = new Date(req.body.expiresAt);
    if (req.body.status) {
      updateData.status = req.body.status;
      if (req.body.status === 'active' && req.user.isAdmin) {
        updateData.approvedBy = req.user._id;
        updateData.approvalDate = new Date();
      }
    }

    if (req.body.images) {
      const newImages = JSON.parse(req.body.images);
      updateData.images = [...(paymentFeature.images || []), ...newImages];
    }

    if (req.body.videos) {
      const newVideos = JSON.parse(req.body.videos);
      updateData.videos = [...(paymentFeature.videos || []), ...newVideos];
    }

    paymentFeature = await PaymentFeature.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Feature ya kulipa imesasishwa kikamilifu',
      data: paymentFeature
    });

  } catch (error) {
    console.error('Error updating payment feature:', error);
    res.status(500).json({
      success: false,
      message: 'Hitilafu wakati wa kusasisha feature',
      error: error.message
    });
  }
});

// Delete payment feature (admin only)
router.delete('/:id', protect, isAdmin, async (req, res) => {
  try {
    const paymentFeature = await PaymentFeature.findById(req.params.id);

    if (!paymentFeature) {
      return res.status(404).json({
        success: false,
        message: 'Feature haijakutwa'
      });
    }

    for (const image of paymentFeature.images || []) {
      if (image.publicId) {
        await deleteFromCloudinary(image.publicId);
      }
    }

    for (const video of paymentFeature.videos || []) {
      if (video.publicId) {
        await deleteFromCloudinary(video.publicId);
      }
    }

    await PaymentFeature.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Feature ya kulipa imefanikiwa kufuta',
      data: paymentFeature
    });

  } catch (error) {
    console.error('Error deleting payment feature:', error);
    res.status(500).json({
      success: false,
      message: 'Hitilafu wakati wa kufuta feature',
      error: error.message
    });
  }
});

// Toggle featured status (admin only)
router.patch('/:id/toggle-featured', protect, isAdmin, async (req, res) => {
  try {
    const paymentFeature = await PaymentFeature.findById(req.params.id);

    if (!paymentFeature) {
      return res.status(404).json({
        success: false,
        message: 'Feature haijakutwa'
      });
    }

    paymentFeature.featured = !paymentFeature.featured;
    await paymentFeature.save();

    res.json({
      success: true,
      message: paymentFeature.featured ? 'Feature imewekwa kwenye vipindi vya muhimu' : 'Feature imeson shu gpia vipindi vya muhimu',
      data: paymentFeature
    });

  } catch (error) {
    console.error('Error toggling featured status:', error);
    res.status(500).json({
      success: false,
      message: 'Hitilafu wakati wa kubadili vipindi vya muhimu',
      error: error.message
    });
  }
});

// Increment inquiry count
router.post('/:id/inquiry', async (req, res) => {
  try {
    const paymentFeature = await PaymentFeature.findById(req.params.id);

    if (!paymentFeature) {
      return res.status(404).json({
        success: false,
        message: 'Feature haijakutwa'
      });
    }

    await paymentFeature.incrementInquiry();

    res.json({
      success: true,
      message: 'Ombi lako limesongezwa',
      data: paymentFeature
    });

  } catch (error) {
    console.error('Error incrementing inquiry:', error);
    res.status(500).json({
      success: false,
      message: 'Hitilafu wakati wa kuongeza maombi',
      error: error.message
    });
  }
});

// Search payment features
router.get('/search/advanced', async (req, res) => {
  try {
    const { query, location, category, minPrice, maxPrice, featured } = req.query;

    let filter = { status: 'active' };

    if (featured === 'true') {
      filter.featured = true;
    }

    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { location: { $regex: query, $options: 'i' } },
        { tags: { $in: [new RegExp(query, 'i')] } }
      ];
    }

    if (location) {
      filter.location = { $regex: location, $options: 'i' };
    }

    if (category) {
      filter.category = category;
    }

    if (minPrice) {
      filter.price = { $gte: parseFloat(minPrice) };
      if (maxPrice) {
        filter.price.$lte = parseFloat(maxPrice);
      }
    } else if (maxPrice) {
      filter.price = { $lte: parseFloat(maxPrice) };
    }

    const paymentFeatures = await PaymentFeature.find(filter)
      .populate('createdBy', 'username profilePicture')
      .sort({ featured: -1, createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      count: paymentFeatures.length,
      data: paymentFeatures
    });

  } catch (error) {
    console.error('Error searching payment features:', error);
    res.status(500).json({
      success: false,
      message: 'Hitilafu wakati wa utafutaji',
      error: error.message
    });
  }
});

module.exports = router;
