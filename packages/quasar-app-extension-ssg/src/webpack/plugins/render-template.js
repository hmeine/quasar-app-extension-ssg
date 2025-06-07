import { readFileSync } from "fs";
import { sources, Compilation } from "webpack";
import appPaths from "@quasar/app-webpack/lib/app-paths.js";
import { getIndexHtml } from "../helpers/html-template.js";

export default class RenderTemplatePlugin {
  constructor(cfg = {}) {
    this.cfg = cfg;
  }

  apply(compiler) {
    compiler.hooks.thisCompilation.tap('render-template', (compilation) => {
      compilation.hooks.processAssets.tapPromise({ name: 'render-template', state: Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL }, async () => {
        if (this.cfg.ctx.dev) {
          compilation.fileDependencies.add(
            appPaths.resolve.app(this.cfg.sourceFiles.indexHtmlTemplate),
          );
        }

        compilation.emitAsset('render-template.js', new sources.RawSource(this.getHtmlTemplate()));
      });
    });
  }

  getHtmlTemplate() {
    const htmlFile = appPaths.resolve.app(this.cfg.sourceFiles.indexHtmlTemplate);
    const renderTemplate = getIndexHtml(readFileSync(htmlFile, 'utf-8'), this.cfg);

    return `module.exports=${renderTemplate.source}`;
  }
};
