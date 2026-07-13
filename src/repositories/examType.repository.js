'use strict';

const supabase = require('../config/supabase');
const { unwrap } = require('./base.repository');

async function findByCode(code) {
  const result = await supabase.from('exam_types').select('*').eq('code', code).maybeSingle();
  return unwrap(result);
}

module.exports = { findByCode };
