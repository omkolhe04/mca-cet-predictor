'use strict';

const adminDashboardService = require('../services/adminDashboard.service');

async function showDashboard(req, res) {
  const stats = await adminDashboardService.getDashboardStats();
  res.render('admin/dashboard', { title: 'Dashboard', stats });
}

module.exports = { showDashboard };
