const express = require('express');
const router = express.Router();
const PaymentFeature = require('../models/PaymentFeature');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');

// Create new payment feature (admin only)
router.post('/', auth, admin, async (req, res) => {
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
    res.status(500).json({\n      success: false,\n      message: 'Hitilafu wakati wa kupata feature',\n      error: error.message\n    });\n  }\n});\n\n// Update payment feature (admin or owner)\nrouter.put('/:id', auth, async (req, res) => {\n  try {\n    let paymentFeature = await PaymentFeature.findById(req.params.id);\n\n    if (!paymentFeature) {\n      return res.status(404).json({\n        success: false,\n        message: 'Feature haijakutwa'\n      });\n    }\n\n    if (paymentFeature.createdBy.toString() !== req.user._id && !req.user.isAdmin) {\n      return res.status(403).json({\n        success: false,\n        message: 'Hakuna ruhusa kugeuza feature hii'\n      });\n    }\n\n    const updateData = { ...req.body };\n\n    if (req.body.price) updateData.price = parseFloat(req.body.price);\n    if (req.body.maxPrice) updateData.maxPrice = parseFloat(req.body.maxPrice);\n    if (req.body.expiresAt) updateData.expiresAt = new Date(req.body.expiresAt);\n    if (req.body.status) {\n      updateData.status = req.body.status;\n      if (req.body.status === 'active' && req.user.isAdmin) {\n        updateData.approvedBy = req.user._id;\n        updateData.approvalDate = new Date();\n      }\n    }\n\n    if (req.body.images) {\n      const newImages = JSON.parse(req.body.images);\n      updateData.images = [...(paymentFeature.images || []), ...newImages];\n    }\n\n    if (req.body.videos) {\n      const newVideos = JSON.parse(req.body.videos);\n      updateData.videos = [...(paymentFeature.videos || []), ...newVideos];\n    }\n\n    paymentFeature = await PaymentFeature.findByIdAndUpdate(\n      req.params.id,\n      updateData,\n      { new: true, runValidators: true }\n    );\n\n    res.json({\n      success: true,\n      message: 'Feature ya kulipa imesasishwa kikamilifu',\n      data: paymentFeature\n    });\n\n  } catch (error) {\n    console.error('Error updating payment feature:', error);\n    res.status(500).json({\n      success: false,\n      message: 'Hitilafu wakati wa kusasisha feature',\n      error: error.message\n    });\n  }\n});\n\n// Delete payment feature (admin only)\nrouter.delete('/:id', auth, admin, async (req, res) => {\n  try {\n    const paymentFeature = await PaymentFeature.findById(req.params.id);\n\n    if (!paymentFeature) {\n      return res.status(404).json({\n        success: false,\n        message: 'Feature haijakutwa'\n      });\n    }\n\n    for (const image of paymentFeature.images || []) {\n      if (image.publicId) {\n        await deleteFromCloudinary(image.publicId);\n      }\n    }\n\n    for (const video of paymentFeature.videos || []) {\n      if (video.publicId) {\n        await deleteFromCloudinary(video.publicId);\n      }\n    }\n\n    await PaymentFeature.findByIdAndDelete(req.params.id);\n\n    res.json({\n      success: true,\n      message: 'Feature ya kulipa imefanikiwa kufuta',\n      data: paymentFeature\n    });\n\n  } catch (error) {\n    console.error('Error deleting payment feature:', error);\n    res.status(500).json({\n      success: false,\n      message: 'Hitilafu wakati wa kufuta feature',\n      error: error.message\n    });\n  }\n});\n\n// Toggle featured status (admin only)\nrouter.patch('/:id/toggle-featured', auth, admin, async (req, res) => {\n  try {\n    const paymentFeature = await PaymentFeature.findById(req.params.id);\n\n    if (!paymentFeature) {\n      return res.status(404).json({\n        success: false,\n        message: 'Feature haijakutwa'\n      });\n    }\n\n    paymentFeature.featured = !paymentFeature.featured;\n    await paymentFeature.save();\n\n    res.json({\n      success: true,\n      message: paymentFeature.featured ? 'Feature imewekwa kwenye vipindi vya muhimu' : 'Feature imeson shu gpia vipindi vya muhimu',\n      data: paymentFeature\n    });\n\n  } catch (error) {\n    console.error('Error toggling featured status:', error);\n    res.status(500).json({\n      success: false,\n      message: 'Hitilafu wakati wa kubadili vipindi vya muhimu',\n      error: error.message\n    });\n  }\n});\n\n// Increment inquiry count\nrouter.post('/:id/inquiry', async (req, res) => {\n  try {\n    const paymentFeature = await PaymentFeature.findById(req.params.id);\n\n    if (!paymentFeature) {\n      return res.status(404).json({\n        success: false,\n        message: 'Feature haijakutwa'\n      });\n    }\n\n    await paymentFeature.incrementInquiry();\n\n    res.json({\n      success: true,\n      message: 'Ombi lako limesongezwa',\n      data: paymentFeature\n    });\n\n  } catch (error) {\n    console.error('Error incrementing inquiry:', error);\n    res.status(500).json({\n      success: false,\n      message: 'Hitilafu wakati wa kuongeza maombi',\n      error: error.message\n    });\n  }\n});\n\n// Search payment features\nrouter.get('/search/advanced', async (req, res) => {\n  try {\n    const { query, location, category, minPrice, maxPrice, featured } = req.query;\n\n    let filter = { status: 'active' };\n\n    if (featured === 'true') {\n      filter.featured = true;\n    }\n\n    if (query) {\n      filter.$or = [\n        { name: { $regex: query, $options: 'i' } },\n        { description: { $regex: query, $options: 'i' } },\n        { location: { $regex: query, $options: 'i' } },\n        { tags: { $in: [new RegExp(query, 'i')] } }\n      ];\n    }\n\n    if (location) {\n      filter.location = { $regex: location, $options: 'i' };\n    }\n\n    if (category) {\n      filter.category = category;\n    }\n\n    if (minPrice) {\n      filter.price = { $gte: parseFloat(minPrice) };\n      if (maxPrice) {\n        filter.price.$lte = parseFloat(maxPrice);\n      }\n    } else if (maxPrice) {\n      filter.price = { $lte: parseFloat(maxPrice) };\n    }\n\n    const paymentFeatures = await PaymentFeature.find(filter)\n      .populate('createdBy', 'username profilePicture')\n      .sort({ featured: -1, createdAt: -1 })\n      .limit(50);\n\n    res.json({\n      success: true,\n      count: paymentFeatures.length,\n      data: paymentFeatures\n    });\n\n  } catch (error) {\n    console.error('Error searching payment features:', error);\n    res.status(500).json({\n      success: false,\n      message: 'Hitilafu wakati wa utafutaji',\n      error: error.message\n    });\n  }\n});\n\nmodule.exports = router;
