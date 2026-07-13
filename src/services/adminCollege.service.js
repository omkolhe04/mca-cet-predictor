'use strict';

const collegeRepository = require('../repositories/college.repository');
const universityRepository = require('../repositories/university.repository');
const placementRepository = require('../repositories/placement.repository');
const feeRepository = require('../repositories/fee.repository');
const categoryRepository = require('../repositories/category.repository');
const lookupService = require('./lookup.service');
const AppError = require('../utils/AppError');

async function getFormLookups() {
  const universities = await universityRepository.findAllActive();
  return { universities };
}

async function listColleges({ search, page }) {
  const examType = await lookupService.getActiveExamType();
  const pageSize = 20;
  const { rows, total } = await collegeRepository.findAllPaginated({
    examTypeId: examType.id,
    search,
    page,
    pageSize,
  });
  return { colleges: rows, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

async function getCollegeForEdit(id) {
  const college = await collegeRepository.findFullById(id);
  return college ? mapColumnsToFormData(college) : null;
}

/**
 * Reverse of mapFormDataToColumns — converts a DB row (snake_case
 * columns) into the same camelCase shape the form's <input
 * name="..."> attributes use. This keeps the form view's field
 * access consistent whether it's rendering a freshly-loaded
 * college for editing, or re-rendering after a validation
 * failure (where the data is already in req.body's camelCase
 * shape) — one shape, one template, no branching in the view.
 */
function mapColumnsToFormData(college) {
  return {
    id: college.id,
    collegeCode: college.college_code,
    name: college.name,
    city: college.city,
    district: college.district,
    address: college.address,
    pincode: college.pincode,
    websiteUrl: college.website_url,
    googleMapsUrl: college.google_maps_url,
    universityId: college.university_id,
    naacGrade: college.naac_grade,
    nbaAccredited: college.nba_accredited,
    aicteApproved: college.aicte_approved,
    autonomous: college.autonomous,
    hostelAvailable: college.hostel_available,
    establishedYear: college.established_year,
    intakeCapacity: college.intake_capacity,
    isActive: college.is_active,
  };
}

/**
 * Maps the admin form's field names (camelCase, matching the
 * <input name="..."> attributes) onto the colleges table's
 * actual column names.
 */
function mapFormDataToColumns(formData) {
  return {
    college_code: formData.collegeCode,
    name: formData.name,
    city: formData.city || null,
    district: formData.district || null,
    address: formData.address || null,
    pincode: formData.pincode || null,
    website_url: formData.websiteUrl || null,
    google_maps_url: formData.googleMapsUrl || null,
    university_id: formData.universityId || null,
    naac_grade: formData.naacGrade || null,
    nba_accredited: formData.nbaAccredited === 'on',
    aicte_approved: formData.aicteApproved === 'on',
    autonomous: formData.autonomous === 'on',
    hostel_available: formData.hostelAvailable === 'on',
    established_year: formData.establishedYear ? parseInt(formData.establishedYear, 10) : null,
    intake_capacity: formData.intakeCapacity ? parseInt(formData.intakeCapacity, 10) : null,
    is_active: formData.isActive === 'on',
  };
}

async function createCollege(formData) {
  const examType = await lookupService.getActiveExamType();
  const columns = mapFormDataToColumns(formData);
  columns.exam_type_id = examType.id;

  try {
    return await collegeRepository.create(columns);
  } catch (err) {
    // Postgres unique_violation on (exam_type_id, college_code)
    if (err.message && err.message.includes('duplicate key')) {
      throw AppError.badRequest(`A college with code "${formData.collegeCode}" already exists.`);
    }
    throw err;
  }
}

async function updateCollege(id, formData) {
  const columns = mapFormDataToColumns(formData);
  try {
    return await collegeRepository.update(id, columns);
  } catch (err) {
    if (err.message && err.message.includes('duplicate key')) {
      throw AppError.badRequest(`A college with code "${formData.collegeCode}" already exists.`);
    }
    throw err;
  }
}

module.exports = {
  getFormLookups,
  listColleges,
  getCollegeForEdit,
  createCollege,
  updateCollege,
  getPlacementsAndFees,
  addOrUpdatePlacement,
  addOrUpdateFee,
};

/**
 * Placement history + fee breakdown for the college edit page's
 * Placements/Fees sections, plus the category list needed for
 * the fee form's category dropdown.
 */
async function getPlacementsAndFees(collegeId) {
  const [placements, fees, categories] = await Promise.all([
    placementRepository.findAllByCollegeId(collegeId),
    feeRepository.findAllByCollegeId(collegeId),
    categoryRepository.findAll(),
  ]);

  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const feesWithLabels = fees.map((fee) => ({
    ...fee,
    categoryLabel: fee.category_id ? categoryById.get(fee.category_id)?.name || 'Unknown' : 'All Categories (Standard)',
  }));

  return { placements, fees: feesWithLabels, categories };
}

async function addOrUpdatePlacement(collegeId, formData) {
  if (!formData.academicYear) {
    throw AppError.badRequest('Academic year is required');
  }
  return placementRepository.upsertOne({
    college_id: collegeId,
    academic_year: formData.academicYear,
    average_package_lpa: formData.averagePackageLpa || null,
    highest_package_lpa: formData.highestPackageLpa || null,
    students_placed: formData.studentsPlaced || null,
    total_eligible: formData.totalEligible || null,
  });
}

async function addOrUpdateFee(collegeId, formData) {
  if (!formData.academicYear || !formData.annualFee) {
    throw AppError.badRequest('Academic year and annual fee are required');
  }
  return feeRepository.upsertOne({
    college_id: collegeId,
    category_id: formData.categoryId || null,
    academic_year: formData.academicYear,
    annual_fee: formData.annualFee,
    total_course_fee: formData.totalCourseFee || null,
  });
}