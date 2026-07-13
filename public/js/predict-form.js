/**
 * Client-side UX helpers for the prediction form.
 * This is convenience only — public/../src/validators/prediction.validator.js
 * on the server is the validation that actually matters.
 */
'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('predictionForm');
  if (!form) {
    return;
  }

  // Mobile: digits only, max 10.
  const mobileInput = document.getElementById('mobile');
  if (mobileInput) {
    mobileInput.addEventListener('input', () => {
      mobileInput.value = mobileInput.value.replace(/\D/g, '').slice(0, 10);
    });
  }

  // Percentile: digits and a single decimal point only.
  const percentileInput = document.getElementById('percentile');
  if (percentileInput) {
    percentileInput.addEventListener('input', () => {
      let value = percentileInput.value.replace(/[^\d.]/g, '');
      const firstDot = value.indexOf('.');
      if (firstDot !== -1) {
        value = value.slice(0, firstDot + 1) + value.slice(firstDot + 1).replace(/\./g, '');
      }
      percentileInput.value = value;
    });
  }

  // Bootstrap's standard client-side validation trigger.
  // The actual submission still goes to the server either way —
  // this only blocks obviously-empty required fields early.
  form.addEventListener(
    'submit',
    (event) => {
      if (!form.checkValidity()) {
        event.preventDefault();
        event.stopPropagation();
      }
      form.classList.add('was-validated');
    },
    false
  );
});
