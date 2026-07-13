'use strict';

const collegeRepository = require('../repositories/college.repository');
const userRepository = require('../repositories/user.repository');
const predictionRepository = require('../repositories/prediction.repository');
const lookupService = require('./lookup.service');

async function getDashboardStats() {
  const examType = await lookupService.getActiveExamType();

  const [totalColleges, totalUsers, totalPredictions, recentPredictions, categoryBreakdown, dailyCounts] =
    await Promise.all([
      collegeRepository.countAll(examType.id),
      userRepository.countAll(),
      predictionRepository.countAll(),
      predictionRepository.findRecent(10),
      predictionRepository.findCategoryBreakdown(),
      predictionRepository.findDailyCounts(14),
    ]);

  return {
    totalColleges,
    totalUsers,
    totalPredictions,
    recentPredictions: recentPredictions.map((p) => ({
      id: p.id,
      percentile: p.percentile,
      createdAt: p.created_at,
      userName: p.users?.name || 'Unknown',
      userMobile: p.users?.mobile || '',
    })),
    categoryBreakdown,
    dailyCounts,
  };
}

module.exports = { getDashboardStats };