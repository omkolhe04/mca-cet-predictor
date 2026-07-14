'use strict';

const predictionRepository = require('../repositories/prediction.repository');
const userService = require('./user.service');
const lookupService = require('./lookup.service');
const predictionEngine = require('./predictionEngine.service');
const categoryRepository = require('../repositories/category.repository');
const universityRepository = require('../repositories/university.repository');
const collegeRepository = require('../repositories/college.repository');

/**
 * Handles a prediction form submission end-to-end:
 *   1. Create or update the user (mobile as key)
 *   2. Store the submitted inputs as a prediction record
 *   3. Run the Prediction Engine against those inputs
 *   4. Persist the engine's result onto the same prediction row
 */
async function submitPrediction(formData) {
  const examType = await lookupService.getExamTypeByCode(formData.examTypeCode);

  const user = await userService.createOrUpdateUser({
    name: formData.name,
    mobile: formData.mobile,
    email: formData.email,
    gender: formData.gender,
    categoryId: formData.categoryId,
    homeUniversityId: formData.homeUniversityId,
  });

  const prediction = await predictionRepository.create({
    user_id: user.id,
    exam_type_id: examType.id,
    percentile: formData.percentile,
    category_id: formData.categoryId,
    gender: formData.gender,
    home_university_id: formData.homeUniversityId,
    admission_university_id: formData.admissionUniversityId,
    dream_college_id: formData.dreamCollegeId || null,
    is_tfws: formData.isTfws,
    is_ews: formData.isEws,
    is_minority: formData.isMinority,
    is_defence: formData.isDefence,
    is_pwd: formData.isPwd,
  });

  const resultSnapshot = await predictionEngine.runEngine(prediction);
  const updatedPrediction = await predictionRepository.updateResultSnapshot(prediction.id, resultSnapshot);

  return { user, prediction: updatedPrediction };
}

async function getPredictionById(id) {
  return predictionRepository.findById(id);
}

/**
 * Prediction row plus human-readable names for its foreign
 * keys — used by the Phase 3 pending stub page so it doesn't
 * have to show raw UUIDs. Phase 5's real result page will
 * likely superset this with the full result_snapshot instead.
 */
async function getPredictionWithDetails(id) {
  const prediction = await predictionRepository.findById(id);
  if (!prediction) {
    return null;
  }

  const [category, homeUniversity, admissionUniversity, dreamCollege] = await Promise.all([
    categoryRepository.findById(prediction.category_id),
    universityRepository.findById(prediction.home_university_id),
    universityRepository.findById(prediction.admission_university_id),
    prediction.dream_college_id ? collegeRepository.findById(prediction.dream_college_id) : null,
  ]);

  return {
    ...prediction,
    categoryName: category?.name || null,
    homeUniversityName: homeUniversity?.name || null,
    admissionUniversityName: admissionUniversity?.name || null,
    dreamCollegeName: dreamCollege?.name || null,
  };
}

module.exports = { submitPrediction, getPredictionById, getPredictionWithDetails };