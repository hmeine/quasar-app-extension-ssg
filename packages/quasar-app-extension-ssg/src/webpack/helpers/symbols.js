import { webpackNames } from "@quasar/app-webpack/lib/webpack/symbols.js";

webpackNames.ssg = {
  renderer: 'Renderer',
  serverSide: webpackNames.ssr.serverSide,
  clientSide: webpackNames.ssr.clientSide,
};

export { webpackNames };

export function splitWebpackConfig(webpackConfigs, mode) {
  return Object.keys(webpackNames[mode])
    .filter((name) => webpackConfigs[name] !== void 0)
    .map((name) => ({
      name: webpackNames[mode][name],
      webpack: webpackConfigs[name],
    }));
};
