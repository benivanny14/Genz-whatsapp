const express = require('express');
const router = express.Router();
const multer = require('multer');
const PaymentFeature = require('../models/PaymentFeature');
const { superAdminAuth } = require('../middleware/superAdminAuth');
const { uploadFile, deleteFile, validateFile } = require('../config/cloudinary');

const path = require('path');
const fs = require('fs');

const paymentUploadDir = path.join(__dirname, '../uploads/payment-features');
if (!fs.existsSync(paymentUploadDir)) {
  fs.mkdirSync(paymentUploadDir, { recursive: true });
}

const paymentUpload = multer({
  storage: multer.diskStorage({
    destination: paymentUploadDir,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || '');
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    const validation = validateFile(file);
    if (!validation.valid) {
      return cb(new Error(validation.error), false);
    }
    cb(null, true);
  },
  limits: {
    fileSize: 100 * 1024 * 1024,
    files: 8
  }
}).fields([
  { name: 'images', maxCount: 5 },
  { name: 'videos', maxCount: 3 }
]);

// Wrap multer so upload errors are returned as 400 JSON responses
const runPaymentUpload = (req, res, next) => {
  paymentUpload(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message || 'Upload error' });
    }
    next();
  });
};

// Create new payment feature (admin only)
router.post('/', superAdminAuth, runPaymentUpload, async (req, res) => {
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
        const result = await uploadFile(file.path, 'image', {
          folder: 'payment-features/images',
          transformation: [{ width: 1200, quality: 'auto' }]
        });
        images.push({
          url: result.url,
          publicId: result.publicId,
          alt: name
        });
      }
    }

    let videos = [];
    if (req.files && req.files.videos) {
      for (const file of req.files.videos) {
        const result = await uploadFile(file.path, 'video', {
          folder: 'payment-features/videos',
          transformation: [{ quality: 'auto', duration: 30 }]
        });
        videos.push({
          url: result.url,
          publicId: result.publicId,
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
      message: 'Internal server error while creating the feature',
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

    const filter = {};
    if (req.query.status && req.query.status !== 'all') {
      filter.status = req.query.status;
    } else if (!req.query.status) {
      filter.status = 'active';
    }
    
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
      message: 'Error while fetching features',
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
      message: 'Error while fetching feature',
      error: error.message
    });
  }
});

// Update payment feature (admin or owner)
router.put('/:id', superAdminAuth, async (req, res) => {
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
        message: 'No permission to toggle this feature'
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
      message: 'Payment feature updated successfully',
      data: paymentFeature
    });

  } catch (error) {
    console.error('Error updating payment feature:', error);
    res.status(500).json({
      success: false,
      message: 'Error while updating feature',
      error: error.message
    });
  }
});

// Delete payment feature (admin only)
router.delete('/:id', superAdminAuth, async (req, res) => {
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
        await deleteFile(image.publicId, 'image');
      }
    }

    for (const video of paymentFeature.videos || []) {
      if (video.publicId) {
        await deleteFile(video.publicId, 'video');
      }
    }

    await PaymentFeature.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Payment feature deleted successfully',
      data: paymentFeature
    });

  } catch (error) {
    console.error('Error deleting payment feature:', error);
    res.status(500).json({
      success: false,
      message: 'Error while deleting feature',
      error: error.message
    });
  }
});

// Toggle featured status (admin only)
router.patch('/:id/toggle-featured', superAdminAuth, async (req, res) => {
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
      message: paymentFeature.featured ? 'Feature added to featured' : 'Feature removed from featured',
      data: paymentFeature
    });

  } catch (error) {
    console.error('Error toggling featured status:', error);
    res.status(500).json({
      success: false,
      message: 'Error while toggling featured',
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
      message: 'Your request has been submitted',
      data: paymentFeature
    });

  } catch (error) {
    console.error('Error incrementing inquiry:', error);
    res.status(500).json({
      success: false,
      message: 'Error while adding request',
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
      message: 'Error during search',
      error: error.message
    });
  }
});

module.exports = router;
