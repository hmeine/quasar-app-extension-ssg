import { promisify } from "util";
import webpack from "webpack";
import extensionRunner from "@quasar/app-webpack/lib/app-extension/extensions-runner.js";
import artifacts from "@quasar/app-webpack/lib/artifacts.js";
import printWebpackStats from "@quasar/app-webpack/lib/helpers/print-webpack-stats.js";
import { printWebpackErrors } from "@quasar/app-webpack/lib/helpers/print-webpack-issue/index.js";
import EntryFilesGenerator from "./EntryFilesGenerator.js";
import { displayBuildBanner } from "./helpers/banner.js";
import { log, fatal } from "./helpers/logger.js";
import regenerateTypesFeatureFlags from "./helpers/types-feature-flags.js";
import { splitWebpackConfig } from "./helpers/symbols.js";

function parseWebpackConfig(cfg, mode) {
  const data = splitWebpackConfig(cfg, mode);

  return {
    configs: data.map((d) => d.webpack),
    name: data.map((d) => d.name),
    folder: data.map((d) => d.webpack.output.path),
  };
}


export default async function build(quasarConfFile) {
  await quasarConfFile.addWebpackConf();

  const generator = new EntryFilesGenerator(quasarConfFile);

  const { quasarConf, webpackConf } = quasarConfFile;

  regenerateTypesFeatureFlags(quasarConf);

  const outputFolder = quasarConf.ssg.buildDir;

  artifacts.clean(outputFolder);

  generator.build();

  if (typeof quasarConf.build.beforeBuild === 'function') {
    await quasarConf.build.beforeBuild({ quasarConf });
  }

  // run possible beforeBuild hooks
  await extensionRunner.runHook('beforeBuild', async (hook) => {
    log(`Extension(${hook.api.extId}): Running beforeBuild hook...`);
    await hook.fn(hook.api, { quasarConf });
  });

  // using quasarConfFile.ctx instead of argv.mode
  // because SSR might also have PWA enabled but we
  // can only know it after parsing the quasar.config.js file
  if (quasarConfFile.quasarConf.ctx.mode.pwa === true) {
    const PwaRunner = require('@quasar/app-webpack/lib/pwa');

    await PwaRunner.build(quasarConfFile);
  }

  let webpackData = parseWebpackConfig(webpackConf, 'ssg');

  const compiler = webpack(webpackData.configs);

  const runCompiler = promisify(compiler.run).bind(compiler);
  const closeCompiler = promisify(compiler.close).bind(compiler);

  let multiStats;

  try {
    ({ stats: multiStats } = await runCompiler());
  } catch (err) {
    if (err) {
      console.error(err.stack || err);

      if (err.details) {
        console.error(err.details);
      }

      process.exit(1);
    }
  } finally {
    await closeCompiler();
  }

  artifacts.add(outputFolder);

  console.log();

  multiStats.forEach((stats, index) => {
    if (stats.hasErrors() === true) {
      const summary = printWebpackErrors(webpackData.name[index], stats);
      fatal(`for "${webpackData.name[index]}" with ${summary}. Please check the log above.`, 'COMPILATION FAILED');
    }

    printWebpackStats(
      stats,
      webpackData.folder[index],
      webpackData.name[index],
    );
  });

  // free up memory
  webpackData = void 0;

  displayBuildBanner(quasarConfFile.ctx, 'build', {
    outputFolder,
    transpileBanner: quasarConf.__transpileBanner,
  });

  if (typeof quasarConf.build.afterBuild === 'function') {
    await quasarConf.build.afterBuild({ quasarConf });
  }

  // run possible afterBuild hooks
  await extensionRunner.runHook('afterBuild', async (hook) => {
    log(`Extension(${hook.api.extId}): Running afterBuild hook...`);
    await hook.fn(hook.api, { quasarConf });
  });
};
