'use strict';

const { body } = require('express-validator');
const categoryRepository = require('../repositories/category.repository');
const universityRepository = require('../repositories/university.repository');
const collegeRepository = require('../repositories/college.repository');
const examTypeRepository = require('../repositories/examType.repository');

/**
 * Server-side validation for the prediction form. Mirrors the
 * client-side checks in public/js/predict-form.js, but this is
 * the layer that actually matters — client-side is UX only.
 *
 * NOTE — Dream College is deliberately left OPTIONAL for now.
 * The spec calls for it to be required, but MCA CET colleges
 * only exist because real data has been imported for that exam
 * specifically — MBA CET (and any future exam) starts with an
 * empty college list until its own data is imported, which would
 * make the form unsubmittable for that exam if this were
 * required. TODO: switch to .notEmpty() once every active exam
 * has real college data.
 */
const predictionFormValidators = [
  body('examTypeCode')
    .trim()
    .notEmpty()
    .withMessage('Please select which exam this prediction is for')
    .bail()
    .custom(async (value) => {
      const examType = await examTypeRepository.findByCode(value);
      if (!examType || !examType.is_active) {
        throw new Error('Selected exam is not available');
      }
      return true;
    }),

  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 150 })
    .withMessage('Name must be between 2 and 150 characters')
    .matches(/^[a-zA-Z\s.'-]+$/)
    .withMessage('Name can only contain letters, spaces, and . \' -'),

  body('mobile')
    .trim()
    .notEmpty()
    .withMessage('Mobile number is required')
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Enter a valid 10-digit Indian mobile number'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Enter a valid email address')
    .isLength({ max: 255 }),

  body('percentile')
    .trim()
    .notEmpty()
    .withMessage('Percentile is required')
    .isFloat({ min: 0, max: 100 })
    .withMessage('Percentile must be between 0 and 100'),

  body('gender')
    .trim()
    .notEmpty()
    .withMessage('Gender is required')
    .isIn(['Male', 'Female', 'Transgender'])
    .withMessage('Select a valid gender'),

  body('categoryId')
    .trim()
    .notEmpty()
    .withMessage('Category is required')
    .isUUID()
    .withMessage('Select a valid category')
    .bail()
    .custom(async (value) => {
      const exists = await categoryRepository.existsById(value);
      if (!exists) {
        throw new Error('Selected category does not exist');
      }
      return true;
    }),

  body('homeUniversityId')
    .trim()
    .notEmpty()
    .withMessage('Home university is required')
    .isUUID()
    .withMessage('Select a valid home university')
    .bail()
    .custom(async (value) => {
      const exists = await universityRepository.existsById(value);
      if (!exists) {
        throw new Error('Selected home university does not exist');
      }
      return true;
    }),

  body('admissionUniversityId')
    .trim()
    .notEmpty()
    .withMessage('Admission university is required')
    .isUUID()
    .withMessage('Select a valid admission university')
    .bail()
    .custom(async (value) => {
      const exists = await universityRepository.existsById(value);
      if (!exists) {
        throw new Error('Selected admission university does not exist');
      }
      return true;
    }),

  // Optional for now — see NOTE above.
  body('dreamCollegeId')
    .optional({ checkFalsy: true })
    .trim()
    .isUUID()
    .withMessage('Select a valid dream college')
    .bail()
    .custom(async (value) => {
      const exists = await collegeRepository.existsById(value);
      if (!exists) {
        throw new Error('Selected dream college does not exist');
      }
      return true;
    }),

  // Checkboxes: present ('on') or absent entirely from req.body
  // when unchecked (standard HTML behavior) — coerced to a real
  // boolean explicitly in the controller, not here.
];

module.exports = { predictionFormValidators };