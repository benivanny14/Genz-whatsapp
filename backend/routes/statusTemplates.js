const express = require('express');
const router = express.Router();
const {
  createTemplate,
  getTemplates,
  getTemplate,
  updateTemplate,
  deleteTemplate,
  getPublicTemplates,
  duplicateTemplate
} = require('../controllers/statusTemplateController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getTemplates)
  .post(createTemplate);

router.get('/public', getPublicTemplates);

router.route('/:id')
  .get(getTemplate)
  .put(updateTemplate)
  .delete(deleteTemplate);

router.post('/:id/duplicate', duplicateTemplate);

module.exports = router;
