import { ProgressPlugin } from "webpack";
import throttle from "lodash/throttle.js";
import chalk from "chalk";
import appPaths from "@quasar/app-webpack/lib/app-paths.js";
import isMinimalTerminal from "@quasar/app-webpack/lib/helpers/is-minimal-terminal.js";
import { printWebpackWarnings, printWebpackErrors } from "@quasar/app-webpack/lib/helpers/print-webpack-issue/index.js";
import progressLog from "@quasar/app-webpack/lib/helpers/progress-log.js";
import { quasarVersion, cliAppVersion, ssgVersion } from "../helpers/banner.js";
import {
  success,
  info,
  error,
  warning,
  clearConsole,
} from "../helpers/logger.js";
let maxLengthName = 0;
let isDev = false;
let ipList;

const compilations = [];

function isCompilationIdle() {
  return compilations.every((entry) => entry.idle === true);
}

function isExternalProgressIdle() {
  return compilations.every((entry) => entry.externalWork === false);
}

function getIPList() {
  // expensive operation, so cache the response
  if (ipList === void 0) {
    const { getIPs } = require('@quasar/app-webpack/lib/helpers/net');
    ipList = getIPs().map((ip) => (ip === '127.0.0.1' ? 'localhost' : ip));
  }

  return ipList;
}

function createState(name, hasExternalWork) {
  const state = {
    name,
    idle: true,
    compiled: false,
    warnings: null,
    errors: null,
    startTime: null,
    progress: null,
    progressMessage: '',
    progressDetails: '',
    externalWork: hasExternalWork === true,
  };

  const len = name.length;
  if (len > maxLengthName) {
    maxLengthName = len;
  }

  compilations.push(state);
  return state;
}

/**
 * Progress bar related
 */

const barLength = 20;
const barProgressFactor = barLength / 100;
const barString = Array.from({ length: barLength })
  .map((_, index) => {
    const p = index / barLength;
    const color = p <= 0.5
      ? chalk.rgb(255, Math.round(p * 510), 0)
      : chalk.rgb(255 - Math.round(p * 122), 255, 0);

    return color('█');
  });

function printBars() {
  if (progressLog.isActive !== true) {
    return;
  }

  const prefixLen = compilations.length - 1;

  const lines = compilations.map((state, index) => {
    const prefix = index < prefixLen ? '├──' : '└──';

    const name = chalk.green(state.name.padEnd(maxLengthName));

    const barWidth = Math.floor(state.progress * barProgressFactor);
    const bar = barString
      .map((char, idx) => (idx <= barWidth ? char : ' '))
      .join('');

    const details = state.idle === false
      ? `${state.progress}% ${[
        state.progressMessage,
        state.progressDetails ? [state.progressDetails[0], state.progressDetails[1]].filter((s) => s).join(' ') : '',
      ].filter((m) => m).join(' ')}`
      : 'idle';

    return ` ${prefix} ${name} ${bar} ${chalk.grey(details)}\n`;
  });

  progressLog(`\n • ${chalk.green.bold('Compiling')}:\n${lines.join('')}`);
}

const renderBars = throttle(printBars, 200);

/**
 * Status related
 */

const greenBanner = chalk.green('»');

let readyBanner;

function printReadyBanner() {
  const webpackCompilations = compilations.map((c) => `"${c.name}"`).join(', ');

  clearConsole();
  success(`Compiled: ${webpackCompilations}\n`, 'READY');

  if (readyBanner) {
    console.log(readyBanner);
  }
}

function getReadyBanner(cfg) {
  const urlList = cfg.devServer.host === '0.0.0.0'
    ? getIPList().map((ip) => chalk.green(cfg.__getUrl(ip))).join('\n                              ')
    : chalk.green(cfg.build.APP_URL);

  return `${[
    ` ${greenBanner} App dir................... ${chalk.green(appPaths.appDir)}`,
    ` ${greenBanner} App URL................... ${urlList}`,
    ` ${greenBanner} Dev mode.................. ${chalk.green(cfg.ctx.modeName + (cfg.ctx.mode.ssr && cfg.ctx.mode.pwa ? ' + pwa' : ''))}`,
    ` ${greenBanner} Pkg quasar................ ${chalk.green(`v${quasarVersion}`)}`,
    ` ${greenBanner} Pkg @quasar/app-webpack... ${chalk.green(`v${cliAppVersion}`)}`,
    ` ${greenBanner} Pkg ssg................... ${chalk.green(`v${ssgVersion}`)}`,
    ` ${greenBanner} Transpiled JS............. ${cfg.__transpileBanner}`,
  ].join('\n')}\n`;
}

function printStatus() {
  if (isDev === true && (isCompilationIdle() === false || isExternalProgressIdle() === false)) {
    return;
  }

  const entriesWithErrors = compilations.filter((entry) => entry.errors !== null);
  if (entriesWithErrors.length > 0) {
    if (isDev === true) { clearConsole(); }

    entriesWithErrors.forEach((entry) => { printWebpackErrors(entry.name, entry.errors); });
    console.log();
    error('Please check the log above for details.\n', 'COMPILATION FAILED');

    if (isDev === false) { process.exit(1); }

    return;
  }

  if (isDev === true) {
    if (compilations.every((entry) => entry.compiled === true)) {
      printReadyBanner();
    }
  } else if (isCompilationIdle() === false || isExternalProgressIdle() === false) {
    return;
  }

  const entriesWithWarnings = compilations.filter((entry) => entry.warnings !== null);
  if (entriesWithWarnings.length > 0) {
    entriesWithWarnings.forEach((entry) => { printWebpackWarnings(entry.name, entry.warnings); });
    console.log();
    warning('Compilation succeeded but there are warning(s). Please check the log above.\n');
  }
}

export default class WebpackProgressPlugin extends ProgressPlugin {
  constructor({ name, cfg, hasExternalWork }) {
    const useBars = isMinimalTerminal !== true && cfg.build.showProgress === true;

    if (useBars === true) {
      super({
        handler: (percent, msg, ...details) => {
          this.updateBars(percent, msg, details);
        },
      });
    } else {
      super({ handler: () => { } });
    }

    this.opts = {
      name,
      useBars,
      hasExternalWork,
    };

    isDev = cfg.ctx.dev === true;

    if (isDev) {
      readyBanner = getReadyBanner(cfg);
    }
  }

  apply(compiler) {
    if (this.opts.useBars) {
      super.apply(compiler);
    }

    compiler.hooks.watchClose.tap('QuasarProgressPlugin', () => {
      const index = compilations.indexOf(this.state);
      compilations.splice(index, 1);

      delete this.state;

      if (this.opts.useBars === true) {
        if (compilations.length === 0) {
          // ensure progress log is stopped!
          progressLog.stop();
        }

        maxLengthName = compilations.reduce(
          (acc, entry) => (entry.name.length > acc ? entry.name.length : acc),
          0,
        );
      }
    });

    compiler.hooks.compile.tap('QuasarProgressPlugin', () => {
      if (this.state === void 0) {
        this.state = createState(this.opts.name, this.opts.hasExternalWork);
      } else {
        this.resetStats();
      }

      this.state.idle = false;

      if (this.opts.hasExternalWork === true) {
        this.state.externalWork = true;
      }

      info(`Compiling of "${this.state.name}" in progress...`, 'WAIT');

      if (this.opts.useBars === true) {
        progressLog.start();
      }

      this.state.startTime = +new Date();
    });

    compiler.hooks.done.tap('QuasarStatusPlugin', (stats) => {
      this.state.idle = true;
      this.resetStats();

      if (stats.hasErrors()) {
        this.state.errors = stats;

        if (this.opts.hasExternalWork === true) {
          this.state.externalWork = false;
        }
      } else {
        this.state.compiled = true;
        if (stats.hasWarnings()) {
          this.state.warnings = stats;
        }
      }

      if (this.opts.useBars === true && isCompilationIdle() === true) {
        progressLog.stop();
      }

      const diffTime = +new Date() - this.state.startTime;

      if (this.state.errors !== null) {
        error(`"${this.state.name}" compiled with errors • ${diffTime}ms`, 'DONE');
      } else if (this.state.warnings !== null) {
        warning(`"${this.state.name}" compiled, but with warnings • ${diffTime}ms`, 'DONE');
      } else {
        success(`"${this.state.name}" compiled with success • ${diffTime}ms`, 'DONE');
      }

      printStatus();
    });
  }

  resetStats() {
    this.state.errors = null;
    this.state.warnings = null;
  }

  updateBars(percent, msg, details) {
    // it may still be called even after compilation was closed
    // due to Webpack's delayed call of handler
    if (this.state === void 0) { return; }

    const progress = Math.floor(percent * 100);
    const running = progress < 100;

    this.state.progress = progress;
    this.state.progressMessage = running && msg ? msg : '';
    this.state.progressDetails = details;

    if (this.opts.useBars === true) { renderBars(); }
  }
};

export function doneExternalWork(webpackName) {
  const state = compilations.find((entry) => entry.name === webpackName);
  state.externalWork = false;
  printStatus();
};
