import { posix } from "path";
import {
  green,
  grey,
  bgBlue,
  underline,
  bold,
} from "chalk";
import { getPackageVersion } from "../../api.js";
import { version as ssgVersion } from '../../../package.json';

const quasarVersion = getPackageVersion('quasar');
const cliAppVersion = getPackageVersion('@quasar/app-webpack');
const quasarExtrasVersion = getPackageVersion('@quasar/extras');
const webpackVersion = getPackageVersion('webpack');

export function displayBuildBanner(argv, cmd, details) {
  let banner = '';

  if (details) {
    banner += ` ${underline('Build succeeded')}\n`;
  } else if (cmd !== 'dev') {
    banner += ` ${bgBlue('================== BUILD ==================')} \n`;
  }

  banner += `
 ${cmd === 'dev' ? 'Dev mode..................' : 'Build mode................'} ${green('ssg')}
 Pkg ssg................... ${green(`v${ssgVersion}`)}
 Pkg quasar................ ${green(`v${quasarVersion}`)}
 Pkg @quasar/app-webpack... ${green(`v${cliAppVersion}`)}
 Pkg webpack............... ${green(`v${webpackVersion}`)}
 Debugging................. ${cmd === 'dev' || argv.debug ? green('enabled') : grey('no')}`;

  if (details) {
    banner += `\n Transpiled JS............. ${details.transpileBanner}`;
    banner += `
 ==========================
 Output folder............. ${green(details.outputFolder)}`;
  } else {
    banner += '\n';
  }

  console.log(`${banner}`);

  if (!details) {
    const { getBrowsersBanner } = require('@quasar/app-webpack/lib/helpers/browsers-support');
    console.log(getBrowsersBanner());
  }
};

export function displayGenerateBanner(ctx, details) {
  let banner = '';

  if (details) {
    const relativeOutputFolder = posix.relative('', details.outputFolder);

    banner += `\n ${underline('Generate succeeded')}\n`;

    banner += `
 Pkg ssg................... ${green(`v${ssgVersion}`)}
 Pkg quasar................ ${green(`v${quasarVersion}`)}
 Pkg @quasar/app-webpack... ${green(`v${cliAppVersion}`)}
 Debugging................. ${ctx.debug ? green('enabled') : grey('no')}
 SPA fallback.............. ${green(details.fallback)}
 ==========================
 Output folder............. ${green(details.outputFolder)}

 Tip: You can use the "${bold(`$ quasar ssg serve ${relativeOutputFolder}`)}" command
      to create a static web server for testing.

      Type "$ quasar ssg serve -h" for parameters.`;
  } else {
    banner += `\n ${bgBlue('================ GENERATE =================')}`;
  }

  console.log(`${banner}\n`);
};

export { quasarVersion };
export { cliAppVersion };
export { ssgVersion };
export { quasarExtrasVersion };
