import { posix } from "path";
import { green, gray, underline } from "kolorist";
import { getCompilationTarget } from "@quasar/app-vite/lib/helpers/banner-global";
import { getPackageVersion } from "../../api.js";
const quasarVersion = getPackageVersion('quasar');
const cliAppVersion = getPackageVersion('@quasar/app-vite');
const quasarExtrasVersion = getPackageVersion('@quasar/extras');
const viteVersion = getPackageVersion('vite');
const ssgVersion = require('../../../package.json').version;


export default function displayBanner(argv, cmd, details) {
  let banner = '';

  if (details && details.outputFolder) {
    banner += ` ${underline('Build succeeded')}\n\n`;
  }

  banner += ` ${cmd === 'dev' ? 'Dev mode...............' : 'Build mode.............'} ${green(argv.mode)}`;
  banner += `\n Pkg quasar............. ${green(`v${quasarVersion}`)}`;
  banner += `\n Pkg @quasar/app-vite... ${green(`v${cliAppVersion}`)}`;
  banner += `\n Pkg vite............... ${green(`v${viteVersion}`)}`;
  banner += `\n Pkg ssg................ ${green(`v${ssgVersion}`)}`;
  banner += `\n Debugging.............. ${cmd === 'dev' || argv.debug ? green('enabled') : gray('no')}`;

  if (!details) {
    console.log(`${banner}\n`);

    return;
  }

  const relativeOutputFolder = posix.relative('', details.outputFolder);

  banner += `\n Cache.................. ${cmd === 'generate' && details.cache ? green('enabled') : gray('no')}`;
  banner += `\n SPA fallback........... ${green(details.fallback)}`;
  banner += `\n Browser target......... ${getCompilationTarget(details.target.browser)}`;
  banner += `\n Node target............ ${getCompilationTarget(details.target.node)}`;
  banner += '\n =======================';

  if (cmd === 'generate' && details.cache) {
    banner += `\n Cache Folder........... ${green(details.compilationFolder)}`;
  }

  banner += `\n Output folder.......... ${green(details.outputFolder)}

 Tip: You can use "$ quasar ssg serve ${relativeOutputFolder}" command to create
      a static web server for testing. Type "$ quasar ssg serve -h" for parameters.`;

  console.log(`${banner}\n`);
};

export { quasarVersion };
export { cliAppVersion };
export { quasarExtrasVersion };
export { viteVersion };
export { ssgVersion };
export { getCompilationTarget };
