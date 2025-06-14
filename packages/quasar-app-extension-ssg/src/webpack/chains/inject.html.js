import { join } from "path";
import HtmlWebpackPlugin from "html-webpack-plugin";
import appPaths from "@quasar/app-webpack/lib/app-paths.js";
import { hasPackage } from "../../api.js";
const HtmlAddonsPlugin = require('../plugins/html-addons').plugin;

function getHtmlFilename(cfg) {
  if (cfg.ctx.mode.pwa) {
    return cfg.ctx.dev
      ? cfg.build.ssrPwaHtmlFilename
      : join(cfg.ssg.buildDir, 'www', cfg.build.ssrPwaHtmlFilename);
  }

  return cfg.ctx.dev
    ? cfg.build.htmlFilename
    : join(cfg.ssg.buildDir, 'www', cfg.build.htmlFilename);
}


export default function injectHtml(chain, cfg) {
  let templateParam;

  if (cfg.ctx.mode.pwa) {
    // deep copy
    templateParam = JSON.parse(JSON.stringify(cfg.htmlVariables));

    templateParam.ctx.mode = { pwa: true };
    templateParam.ctx.modeName = 'pwa';
    if (templateParam.process && templateParam.process.env) {
      templateParam.process.env.MODE = 'pwa';
    }
  }

  chain.plugin('html-webpack')
    .use(HtmlWebpackPlugin, [{
      filename: getHtmlFilename(cfg),
      template: appPaths.resolve.app(cfg.sourceFiles.indexHtmlTemplate),
      minify: hasPackage('@quasar/app-webpack', '>= 3.11.0') ? cfg.build.htmlMinifyOptions : cfg.__html.minifyOptions,
      templateParameters: templateParam || cfg.htmlVariables,
      chunksSortMode: 'none',
      // inject script tags for bundle
      inject: true,
      cache: true,
    }]);

  chain.plugin('html-addons')
    .use(HtmlAddonsPlugin, [cfg]);
};
