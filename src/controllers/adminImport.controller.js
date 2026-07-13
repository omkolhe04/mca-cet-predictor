'use strict';

const { importCutoffData } = require('../services/import/cutoffImport.service');
const adminImportHistoryService = require('../services/adminImportHistory.service');
const adminDataResetService = require('../services/adminDataReset.service');
const AppError = require('../utils/AppError');

async function showForm(req, res) {
  const [history, resetPreview] = await Promise.all([
    adminImportHistoryService.listImportHistory(),
    adminDataResetService.getResetPreview(),
  ]);
  res.render('admin/import', { title: 'Import Cutoff Data', report: null, history, resetPreview });
}

/**
 * Thin web wrapper around the exact same import engine the CLI
 * script (scripts/import-cutoffs.js) uses — same service,
 * same validation, same duplicate-prevention. Only the input
 * source (uploaded file vs. filesystem path) differs.
 */
async function handleUpload(req, res) {
  if (!req.file) {
    throw AppError.badRequest('Please choose a JSON file to upload.');
  }

  let rows;
  try {
    rows = JSON.parse(req.file.buffer.toString('utf8'));
  } catch (err) {
    throw AppError.badRequest(`Uploaded file is not valid JSON: ${err.message}`);
  }

  const examTypeCode = req.body.examTypeCode || 'MCA_CET';
  const report = await importCutoffData(examTypeCode, rows, {
    filename: req.file.originalname,
    importedByAdminId: req.admin.adminId,
  });

  const [history, resetPreview] = await Promise.all([
    adminImportHistoryService.listImportHistory(),
    adminDataResetService.getResetPreview(),
  ]);
  res.render('admin/import', { title: 'Import Cutoff Data', report, history, resetPreview });
}

/**
 * Deletes an import batch's cutoff data. Colleges/branches it
 * created are left in place — see adminImportHistory.service.js.
 */
async function deleteBatch(req, res) {
  await adminImportHistoryService.deleteImportBatch(req.params.id);
  res.redirect('/admin/import');
}

/**
 * Danger-zone action: wipes ALL college/branch/cutoff/import
 * data for the active exam type. Requires an exact typed
 * confirmation phrase, checked server-side in the service.
 */
async function resetData(req, res) {
  await adminDataResetService.resetExamData(req.body.confirmText);
  res.redirect('/admin/import');
}

module.exports = { showForm, handleUpload, deleteBatch, resetData };