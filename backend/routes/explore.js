const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getExplore, searchExplore } = require('../controllers/exploreController');

router.use(protect);

router.get('/', getExplore);
router.get('/search', searchExplore);

module.exports = router;
