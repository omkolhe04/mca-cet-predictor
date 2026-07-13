'use strict';

const categoryRepository = require('../repositories/category.repository');
const universityRepository = require('../repositories/university.repository');
const collegeRepository = require('../repositories/college.repository');
const examTypeRepository = require('../repositories/examType.repository');
const AppError = require('../utils/AppError');

const ACTIVE_EXAM_TYPE_CODE = 'MCA_CET';

let cachedExamType = null;

/**
 * The active exam type for this deployment of the product.
 * Cached in memory for the process lifetime — exam_types is
 * essentially static reference data that doesn't change while
 * the server is running.
 */
async function getActiveExamType() {
  if (cachedExamType) {
    return cachedExamType;
  }
  const examType = await examTypeRepository.findByCode(ACTIVE_EXAM_TYPE_CODE);
  if (!examType) {
    throw AppError.internal(
      `Exam type "${ACTIVE_EXAM_TYPE_CODE}" not found. Did you run the database seeds?`
    );
  }
  cachedExamType = examType;
  return examType;
}

/**
 * Everything the prediction form's dropdowns need in one call.
 * Colleges will be an empty array until Phase 8's import engine
 * loads real CAP data — expected, not an error.
 */
async function getFormOptions() {
  const examType = await getActiveExamType();

  const [categories, universities, colleges] = await Promise.all([
    categoryRepository.findAllBaseCategories(),
    universityRepository.findAllActive(),
    collegeRepository.findAllActiveByExamType(examType.id),
  ]);

  return { examType, categories, universities, colleges };
}

module.exports = { getActiveExamType, getFormOptions };
