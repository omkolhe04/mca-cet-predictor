/**
 * Centralized environment configuration.
 * Never read process.env directly anywhere else in the app —
 * always import from here. This makes config changes and
 * validation a single-point concern.
 */
'use strict';

require('dotenv').config();

const REQUIRED_VARS = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'USER_SESSION_SECRET',
  'ADMIN_JWT_SECRET',
];

function validateEnv() {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
        'Copy .env.example to .env and fill in the values.'
    );
  }
}

validateEnv();

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT, 10) || 3000,
  appName: process.env.APP_NAME || 'VidyaNITI MCA CET Predictor',
  appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:3000',

  supabase: {
    url: process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    storageBucket: process.env.SUPABASE_STORAGE_BUCKET || 'vidyaniti-assets',
  },

  userSession: {
    secret: process.env.USER_SESSION_SECRET,
    cookieName: process.env.USER_SESSION_COOKIE_NAME || 'vn_uid',
    maxAgeDays: parseInt(process.env.USER_SESSION_MAX_AGE_DAYS, 10) || 365,
  },

  adminAuth: {
    jwtSecret: process.env.ADMIN_JWT_SECRET,
    jwtExpiry: process.env.ADMIN_JWT_EXPIRY || '8h',
  },

  pdf: {
    brandName: process.env.PDF_BRAND_NAME || 'VidyaNITI',
    watermarkText: process.env.PDF_WATERMARK_TEXT || 'VidyaNITI',
  },
};

module.exports = env;
