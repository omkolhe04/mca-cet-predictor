'use strict';

const importBatchRepository = require('../repositories/importBatch.repository');
const cutoffRepository = require('../repositories/cutoff.repository');
const lookupService = require('./lookup.service');
const AppError = require('../utils/AppError');

async function listImportHistory() {
  const examType = await lookupService.getActiveExamType();
  const batches = await importBatchRepository.findAllByExamType(examType.id);
  return batches.map((b) => ({
    id: b.id,
    filename: b.filename,
    importedByName: b.admins?.name || null,
    createdAt: b.created_at,
    totalRows: b.total_rows,
    validRowCount: b.valid_row_count,
    invalidRowCount: b.invalid_row_count,
    cutoffsUpserted: b.cutoffs_upserted,
  }));
}

/**
 * Deletes an import batch: removes every cutoff row it wrote,
 * then the batch record itself. Colleges and branches are
 * deliberately left untouched — see migration 020's comment for
 * why (they're shared across imports and may carry admin-entered
 * profile data).
 */
async function deleteImportBatch(batchId) {
  const batch = await importBatchRepository.findById(batchId);
  if (!batch) {
    throw AppError.notFound('Import batch not found');
  }

  const deletedCutoffCount = await cutoffRepository.deleteByImportBatchId(batchId);
  await importBatchRepository.deleteById(batchId);

  return { deletedCutoffCount, filename: batch.filename };
}

module.exports = { listImportHistory, deleteImportBatch };
