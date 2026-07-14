'use strict';

const lookupService = require('../services/lookup.service');
const predictionService = require('../services/prediction.service');
const predictionResultService = require('../services/predictionResult.service');
const pdfReportService = require('../services/pdfReport.service');
const userService = require('../services/user.service');
const examTypeRepository = require('../repositories/examType.repository');
const { setUserSessionCookie, getUserIdFromRequest } = require('../utils/userSession');
const { generateRoundCodes, CHANCE_BUCKET_META } = require('../utils/constants');
const { url } = require('../utils/url');

/**
 * GET /predict — renders the form. If the visitor has a
 * returning-user session cookie, their last submitted details
 * are pre-filled — this is the only place that "invisible
 * session" pre-fill happens.
 */
async function showForm(req, res) {
  const examTypes = await lookupService.getAllActiveExamTypes();
  const defaultExamCode = lookupService.DEFAULT_EXAM_TYPE_CODE;
  const formOptions = await lookupService.getFormOptions(defaultExamCode);
  const existingUser = await userService.findUserById(getUserIdFromRequest(req));

  const formValues = existingUser
    ? {
        name: existingUser.name,
        mobile: existingUser.mobile,
        email: existingUser.email,
        gender: existingUser.gender,
        categoryId: existingUser.last_category_id,
        homeUniversityId: existingUser.last_home_university_id,
      }
    : {};

  res.render('pages/predict', {
    title: 'Start Your Prediction',
    examTypes,
    selectedExamCode: defaultExamCode,
    ...formOptions,
    formValues,
    errors: {},
  });
}

/**
 * POST /predict — reached only after validateRequest middleware
 * confirms the input is clean. Creates/updates the user, sets
 * the invisible session cookie, stores the prediction inputs,
 * runs the Prediction Engine, and redirects to the result page.
 */
async function submitForm(req, res) {
  const formData = {
    examTypeCode: req.body.examTypeCode,
    name: req.body.name.trim(),
    mobile: req.body.mobile.trim(),
    email: req.body.email.trim().toLowerCase(),
    percentile: parseFloat(req.body.percentile),
    gender: req.body.gender,
    categoryId: req.body.categoryId,
    homeUniversityId: req.body.homeUniversityId,
    admissionUniversityId: req.body.admissionUniversityId,
    dreamCollegeId: req.body.dreamCollegeId || null,
    isTfws: req.body.isTfws === 'on',
    isEws: req.body.isEws === 'on',
    isMinority: req.body.isMinority === 'on',
    isDefence: req.body.isDefence === 'on',
    isPwd: req.body.isPwd === 'on',
  };

  const { user, prediction } = await predictionService.submitPrediction(formData);

  setUserSessionCookie(res, user.id);

  res.redirect(url(`/predict/${prediction.id}/result`));
}

/**
 * GET /predict/:id/result — the real result page. Renders the
 * Prediction Engine's per-round chance breakdown, the dream
 * college card, and the recommended CAP preference order, all
 * enriched with fee/placement/NAAC display data.
 */
async function showResult(req, res) {
  const resultView = await predictionResultService.buildResultView(req.params.id);

  if (!resultView) {
    return res.status(404).render('pages/error', {
      title: 'Not Found',
      statusCode: 404,
      message: 'We could not find that prediction.',
    });
  }

  // Round codes come from the snapshot itself (set by the engine
  // at computation time — could be 4 rounds for MCA CET, 3 for
  // MBA CET, etc.), not a hardcoded constant. Predictions computed
  // before this existed fall back to 4, matching what the engine
  // always produced at the time.
  const roundCodes = resultView.snapshot?.roundCodes || generateRoundCodes(4);

  const examType = await examTypeRepository.findById(resultView.prediction.exam_type_id);
  const examName = examType ? examType.name : 'MCA CET';

  res.render('pages/result', {
    title: 'Your Prediction Result',
    prediction: resultView.prediction,
    snapshot: resultView.snapshot,
    collegeDetails: resultView.collegeDetails,
    CAP_ROUNDS: roundCodes,
    CHANCE_BUCKET_META,
    examName,
  });
}

/**
 * GET /predict/:id/pdf — streams a freshly generated PDF report
 * for this prediction. Generated on-demand every time, no
 * caching/storage, per product decision.
 */
async function downloadPdf(req, res) {
  const buffer = await pdfReportService.generateReportBuffer(req.params.id);

  if (!buffer) {
    return res.status(404).render('pages/error', {
      title: 'Not Found',
      statusCode: 404,
      message: 'We could not find that prediction.',
    });
  }

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="VidyaNITI-Prediction-Report.pdf"`,
    'Content-Length': buffer.length,
  });
  res.send(buffer);
}

module.exports = { showForm, submitForm, showResult, downloadPdf };