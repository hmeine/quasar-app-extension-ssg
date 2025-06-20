export default function getQuasarCtx(opts) {
  // opts.mode can be set to 'ssg'
  const ctx = require('@quasar/app-webpack/lib/helpers/get-quasar-ctx')(opts);

  // ssr mode is still needed
  ctx.mode.ssr = true;

  return ctx;
};
