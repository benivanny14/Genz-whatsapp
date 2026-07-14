const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Product = require('../models/Product');

router.use(protect);

// @route   GET /api/products
// @desc    Get all products for the logged in user
router.get('/', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const products = await Product.find({ user: userId }).sort({ createdAt: -1 });
    res.json({ success: true, products });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ success: false, error: 'Kosa la server limejitokeza (Internal server error)' });
  }
});

// @route   POST /api/products
// @desc    Add a product to the user's catalog
router.post('/', async (req, res) => {
  try {
    const { name, description, price, image } = req.body;
    const userId = req.user._id || req.user.id;

    if (!name || price === undefined) {
      return res.status(400).json({ success: false, error: 'Jina la bidhaa na bei ni lazima (Name and price are required)' });
    }

    const product = await Product.create({
      user: userId,
      name,
      description,
      price,
      image: image || ''
    });

    res.status(201).json({ success: true, product });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ success: false, error: 'Kosa la server limejitokeza (Internal server error)' });
  }
});

// @route   DELETE /api/products/:id
// @desc    Delete a product from the catalog by ID
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const product = await Product.findOne({ _id: req.params.id, user: userId });

    if (!product) {
      return res.status(404).json({ success: false, error: 'Bidhaa haikupatikana au huna ruhusa (Product not found or unauthorized)' });
    }

    await Product.deleteOne({ _id: req.params.id });

    res.json({ success: true, message: 'Bidhaa imefutwa kikamilifu (Product deleted successfully)' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ success: false, error: 'Kosa la server limejitokeza (Internal server error)' });
  }
});

module.exports = router;
