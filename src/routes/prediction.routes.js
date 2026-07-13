'use strict';

const express = require('express');
const router = express.Router();

const asyncHandler = require('../utils/asyncHandler');
const validateRequest = require('../middlewares/validateRequest');
const { predictionFormValidators } = require('../validators/prediction.validator');
const predictionController = require('../controllers/prediction.controller');
const lookupService = require('../services/lookup.service');

// Rebuilds the dropdown data needed to re-render the form if
// validation fails — the form view always needs this, whether
// it's a first GET or a failed POST.
async function buildFormLocals() {
  const formOptions = await lookupService.getFormOptions();
  return { ...formOptions, title: 'Start Your Prediction' };
}

router.get('/', asyncHandler(predictionController.showForm));

router.post(
  '/',
  predictionFormValidators,
  validateRequest('pages/predict', buildFormLocals),
  asyncHandler(predictionController.submitForm)
);

router.get('/:id/result', asyncHandler(predictionController.showResult));
router.get('/:id/pdf', asyncHandler(predictionController.downloadPdf));

module.exports = router;