const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const textToolsController = require('../controllers/textToolsController');

router.use(protect);

router.post('/uppercase', textToolsController.toUpperCase);
router.post('/capitalize', textToolsController.capitalize);
router.post('/stylish', textToolsController.toStylish);
router.post('/repeat', textToolsController.repeatText);
router.post('/blank', textToolsController.blankMessage);
router.get('/styles', textToolsController.getStyles);

module.exports = router;
