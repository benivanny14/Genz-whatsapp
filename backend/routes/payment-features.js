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

const parseJsonField = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error('Invalid JSON form field');
  }
};

const parseStringArrayField = (value) => {
  const parsed = parseJsonField(value, []);
  if (!Array.isArray(parsed)) throw new Error('Expected an array form field');
  return parsed.filter(Boolean).map(String);
};

// Multer stores payment media in uploads/payment-features before it is sent to
// Cloudinary.  The explicit local URL is important in development and in a
// Cloudinary fallback: `/uploads/file.mp4` points at the wrong directory.
const uploadPaymentMedia = async (file, type, name) => {
  const result = await uploadFile(file.path, type, {
    folder: `payment-features/${type}s`,
    publicUrl: `/uploads/payment-features/${path.basename(file.path)}`,
    transformation: type === 'image'
      ? [{ width: 1200, quality: 'auto' }]
      : [{ quality: 'auto', duration: 30 }]
  });

  if (result.storageProvider !== 'local') {
    await fs.promises.unlink(file.path).catch(() => {});
  }

  return type === 'image'
    ? {
        url: result.url,
        publicId: result.publicId,
        alt: name,
        thumbnailUrl: result.thumbnailUrl || null
      }
    : {
        url: result.url,
        publicId: result.publicId,
        title: name,
        thumbnailUrl: result.thumbnailUrl || null,
        duration: result.duration || null
      };
};

const uploadPaymentFiles = async (files, field, type, name) => {
  const entries = [];
  for (const file of files?.[field] || []) {
    entries.push(await uploadPaymentMedia(file, type, name));
  }
  return entries;
};

// Create new payment feature (admin only)
router.post('/', superAdminAuth, runPaymentUpload, async (req, res) => {
  try {
    const { name, description, price, location, category, maxPrice, status, contactInfo, tags, specifications, isPrivate, expiresAt } = req.body;

    if (!name || !description || !price || !location || !maxPrice) {
      return res.status(400).json({
        success: false,
        message: 'Name, description, price, location and max price are all required'
      });
    }

    const images = await uploadPaymentFiles(req.files, 'images', 'image', name);
    const videos = await uploadPaymentFiles(req.files, 'videos', 'video', name);

    const parsedContactInfo = parseJsonField(contactInfo, {});
    const parsedTags = parseStringArrayField(tags);
    const parsedSpecifications = parseJsonField(specifications, {});

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
      message: 'Payment feature created successfully',
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
        message: 'Feature not found'
      });
    }

    if (paymentFeature.status !== 'active' && paymentFeature.createdBy._id.toString() !== req.user?._id) {
      return res.status(404).json({
        success: false,
        message: 'Feature not found'
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
router.put('/:id', superAdminAuth, runPaymentUpload, async (req, res) => {
  try {
    let paymentFeature = await PaymentFeature.findById(req.params.id);

    if (!paymentFeature) {
      return res.status(404).json({
        success: false,
        message: 'Feature not found'
      });
    }

    if (paymentFeature.createdBy.toString() !== req.user._id && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'No permission to toggle this feature'
      });
    }

    const updateData = {};
    const scalarFields = ['name', 'description', 'location', 'category', 'status'];
    for (const field of scalarFields) {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    }
    if (req.body.price !== undefined && req.body.price !== '') updateData.price = parseFloat(req.body.price);
    if (req.body.maxPrice !== undefined && req.body.maxPrice !== '') updateData.maxPrice = parseFloat(req.body.maxPrice);
    if (req.body.expiresAt !== undefined) updateData.expiresAt = req.body.expiresAt ? new Date(req.body.expiresAt) : null;
    if (req.body.isPrivate !== undefined) updateData.isPrivate = req.body.isPrivate === 'true' || req.body.isPrivate === true;
    if (req.body.contactInfo !== undefined) updateData.contactInfo = parseJsonField(req.body.contactInfo, {});
    if (req.body.tags !== undefined) updateData.tags = parseStringArrayField(req.body.tags);
    if (req.body.specifications !== undefined) updateData.specifications = parseJsonField(req.body.specifications, {});
    if (req.body.status) {
      updateData.status = req.body.status;
      if (req.body.status === 'active' && req.user.isAdmin) {
        updateData.approvedBy = req.user._id;
        updateData.approvalDate = new Date();
      }
    }

    const removeImagePublicIds = parseStringArrayField(req.body.removeImagePublicIds);
    const removeVideoPublicIds = parseStringArrayField(req.body.removeVideoPublicIds);
    const existingImages = (paymentFeature.images || []).filter((item) => !removeImagePublicIds.includes(item.publicId));
    const existingVideos = (paymentFeature.videos || []).filter((item) => !removeVideoPublicIds.includes(item.publicId));
    const newImages = await uploadPaymentFiles(req.files, 'images', 'image', req.body.name || paymentFeature.name);
    const newVideos = await uploadPaymentFiles(req.files, 'videos', 'video', req.body.name || paymentFeature.name);

    if (removeImagePublicIds.length || newImages.length) updateData.images = [...existingImages, ...newImages];
    if (removeVideoPublicIds.length || newVideos.length) updateData.videos = [...existingVideos, ...newVideos];

    // Delete removed remote media only after the document update inputs have
    // been validated. Local files are ignored safely by deleteFile.
    for (const publicId of [...removeImagePublicIds]) await deleteFile(publicId, 'image').catch(() => {});
    for (const publicId of [...removeVideoPublicIds]) await deleteFile(publicId, 'video').catch(() => {});

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
        message: 'Feature not found'
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
        message: 'Feature not found'
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
        message: 'Feature not found'
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
