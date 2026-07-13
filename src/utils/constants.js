'use strict';

/**
 * The four Maharashtra CAP rounds, in order. Values match the
 * `round` column values assumed in the cutoffs table (see the
 * comment in database/migrations/009_cutoffs.sql and the "Not
 * yet decided" note in database/README.md) — CONFIRM these
 * against a real official CAP cutoff JSON file before Phase 8's
 * import engine goes live; if the real values differ, this is
 * the one place to update them.
 */
const CAP_ROUNDS = ['CAP1', 'CAP2', 'CAP3', 'CAP4'];

/**
 * Chance classification bands, based on the percentile-point
 * difference between the student's percentile and a college's
 * cutoff percentile (difference = studentPercentile - cutoffPercentile).
 *   difference >= VERY_HIGH        -> Very High chance
 *   HIGH <= difference < VERY_HIGH -> High chance
 *   MODERATE <= difference < HIGH  -> Moderate chance
 *   difference < MODERATE          -> Low chance
 */
const CHANCE_THRESHOLDS = {
  VERY_HIGH: 5,
  HIGH: 2,
  MODERATE: -2,
};

/**
 * Maps each special-reservation boolean on a prediction row to
 * the category `code` it corresponds to in the categories table
 * (see database/seeds/002_categories.sql). Used by the engine to
 * work out every category a student is eligible to be evaluated
 * against, beyond their base category.
 */
const SPECIAL_CATEGORY_CODE_BY_FLAG = {
  is_tfws: 'TFWS',
  is_ews: 'EWS',
  is_minority: 'MI',
  is_defence: 'DEFENCE',
  is_pwd: 'PWD',
};

/**
 * Display metadata for each chance bucket — label text and the
 * badge CSS class (defined in public/css/style.css) to use.
 * Colocated with the thresholds above since they describe the
 * same four bands, just for presentation rather than computation.
 */
const CHANCE_BUCKET_META = {
  veryHigh: { label: 'Very High', badgeClass: 'vn-badge-success' },
  high: { label: 'High', badgeClass: 'vn-badge-success' },
  moderate: { label: 'Moderate', badgeClass: 'vn-badge-warning' },
  low: { label: 'Low', badgeClass: 'vn-badge-danger' },
};

module.exports = { CAP_ROUNDS, CHANCE_THRESHOLDS, SPECIAL_CATEGORY_CODE_BY_FLAG, CHANCE_BUCKET_META };