'use strict';

const predictionRepository = require('../repositories/prediction.repository');
const collegeRepository = require('../repositories/college.repository');
const placementRepository = require('../repositories/placement.repository');
const feeRepository = require('../repositories/fee.repository');
const { generateRoundCodes } = require('../utils/constants');

const CHANCE_BUCKET_KEYS = ['veryHigh', 'high', 'moderate', 'low'];

/**
 * Every college id referenced anywhere in the snapshot — across
 * all rounds, all buckets, the dream college, and the
 * recommended preference order — so enrichment data can be
 * fetched in one bulk pass instead of per-card.
 *
 * Uses snapshot.roundCodes (set by the Prediction Engine at
 * computation time) rather than a hardcoded round list — this
 * snapshot might be for a 4-round exam (MCA CET), a 3-round exam
 * (MBA CET), or any other configured count. Predictions computed
 * before this field existed fall back to 4 rounds, matching what
 * the engine always produced at the time.
 */
function collectCollegeIds(snapshot) {
  const ids = new Set();
  const roundCodes = snapshot.roundCodes || generateRoundCodes(4);

  for (const roundCode of roundCodes) {
    const round = snapshot.rounds[roundCode];
    if (!round) continue;
    for (const bucketKey of CHANCE_BUCKET_KEYS) {
      for (const entry of round[bucketKey] || []) ids.add(entry.collegeId);
    }
    for (const entry of round.noData || []) ids.add(entry.collegeId);
  }

  if (snapshot.dreamCollege) {
    ids.add(snapshot.dreamCollege.collegeId);
  }
  for (const entry of snapshot.recommendedPreferenceOrder || []) {
    ids.add(entry.collegeId);
  }

  return Array.from(ids);
}

/**
 * Reduces a list of rows (already ordered most-recent-year
 * first) to a Map of collegeId -> most recent row.
 */
function latestByCollegeId(rows) {
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.college_id)) {
      map.set(row.college_id, row);
    }
  }
  return map;
}

/**
 * Assembles everything the Result Page view needs: the
 * prediction, its engine snapshot, and a Map of collegeId ->
 * enrichment data (NAAC, autonomy, hostel, fee, placement).
 * Returns null if the prediction doesn't exist.
 */
async function buildResultView(predictionId) {
  const prediction = await predictionRepository.findById(predictionId);
  if (!prediction) {
    return null;
  }

  const snapshot = prediction.result_snapshot;
  const hasSnapshot = snapshot && typeof snapshot === 'object' && snapshot.engineVersion;

  if (!hasSnapshot || snapshot.totalCollegesEvaluated === 0) {
    return { prediction, snapshot: hasSnapshot ? snapshot : null, collegeDetails: new Map() };
  }

  const collegeIds = collectCollegeIds(snapshot);

  const [details, placements, fees] = await Promise.all([
    collegeRepository.findDetailsByIds(collegeIds),
    placementRepository.findByCollegeIds(collegeIds),
    feeRepository.findStandardByCollegeIds(collegeIds),
  ]);

  const latestPlacement = latestByCollegeId(placements);
  const latestFee = latestByCollegeId(fees);

  const collegeDetails = new Map();
  for (const college of details) {
    const placement = latestPlacement.get(college.id);
    const fee = latestFee.get(college.id);

    collegeDetails.set(college.id, {
      naacGrade: college.naac_grade,
      autonomous: college.autonomous,
      hostelAvailable: college.hostel_available,
      websiteUrl: college.website_url,
      googleMapsUrl: college.google_maps_url,
      annualFee: fee ? Number(fee.annual_fee) : null,
      averagePackageLpa: placement ? Number(placement.average_package_lpa) : null,
      highestPackageLpa: placement ? Number(placement.highest_package_lpa) : null,
    });
  }

  return { prediction, snapshot, collegeDetails };
}

module.exports = { buildResultView };