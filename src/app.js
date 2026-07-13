'use strict';

const path = require('path');
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const env = require('./config/env');
const logger = require('./utils/logger');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');
const routes = require('./routes');

const app = express();

// ---------------------------------------------------------
// View engine
// ---------------------------------------------------------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// ---------------------------------------------------------
// Security & performance middleware
// ---------------------------------------------------------
app.use(
  helmet({
    contentSecurityPolicy: false, // enabled explicitly once CDN sources are finalized
  })
);
app.use(compression());

// ---------------------------------------------------------
// Request logging
// ---------------------------------------------------------
app.use(morgan(env.isProduction ? 'combined' : 'dev', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// ---------------------------------------------------------
// Body & cookie parsing
// ---------------------------------------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(env.userSession.secret));

// ---------------------------------------------------------
// Static assets
// ---------------------------------------------------------
app.use(express.static(path.join(__dirname, '..', 'public')));

// ---------------------------------------------------------
// Locals available to every view
// ---------------------------------------------------------
app.use((req, res, next) => {
  res.locals.appName = env.appName;
  res.locals.currentPath = req.path;
  next();
});

// ---------------------------------------------------------
// Routes
// ---------------------------------------------------------
app.use('/', routes);

// ---------------------------------------------------------
// 404 + Error handling (must be last)
// ---------------------------------------------------------
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
