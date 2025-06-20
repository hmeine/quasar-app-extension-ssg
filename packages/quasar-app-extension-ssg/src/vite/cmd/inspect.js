import parseArgs from "minimist";

const argv = parseArgs(process.argv.slice(2), {
  alias: {
    c: 'cmd',

    d: 'depth',
    p: 'path',

    t: 'thread',

    h: 'help',
  },
  boolean: ['h', 'colors'],
  string: ['c', 'p', 't'],
  default: {
    c: 'dev',
    d: 2,
    colors: true,
  },
});

if (argv.help) {
  console.log(`
  Description
    Inspect Quasar generated Vite config

  Usage
    $ quasar ssg inspect
    $ quasar ssg inspect -c generate
    $ quasar ssg inspect -p 'build.outDir'

  Options
    --cmd, -c        Quasar command [dev|generate] (default: dev)
    --depth, -d      Number of levels deep (default: 2)
    --path, -p       Path of config in dot notation
                        Examples:
                          -p build.outDir
                          -p plugins
    --thread, -t     Display only one specific app mode config thread
    --colors,        Style output with ANSI color codes (default: true)
    --help, -h       Displays this message
  `);
  process.exit(0);
}

argv.mode = 'ssg';

import { log, fatal } from "../helpers/logger.js";
import displayBanner from "../helpers/banner-global.js";

displayBanner(argv, argv.cmd);

const depth = parseInt(argv.depth, 10) || Infinity;

(async () => {
  const getQuasarCtx = require('../helpers/get-quasar-ctx');
  const ctx = getQuasarCtx({
    mode: 'ssg',
    target: undefined,
    debug: argv.debug,
    dev: argv.cmd === 'dev',
    prod: argv.cmd === 'generate',
  });

  const extensionRunner = require('@quasar/app-vite/lib/app-extension/extensions-runner');
  extensionRunner.extensions.splice(
    extensionRunner.extensions
      .findIndex((extension) => extension.extId === 'ssg'),
    1,
  );

  await extensionRunner.registerExtensions(ctx);

  const QuasarConfFile = require('../quasar-config-file');
  const quasarConfFile = new QuasarConfFile({
    ctx,
    port: argv.port,
    host: argv.hostname,
  });

  const quasarConf = await quasarConfFile.read();
  if (quasarConf.error !== void 0) {
    fatal(quasarConf.error, 'FAIL');
  }

  const configs = require('../ssg-config');

  const cfgEntries = [];
  let threadList = Object.keys(configs);

  if (argv.thread) {
    if (threadList.includes(argv.thread) === false) {
      fatal('Requested thread for inspection is NOT available for selected mode.');
    }

    threadList = [argv.thread];
  }

  await Promise.all(threadList.map(async (name) => {
    cfgEntries.push({
      name,
      object: await configs[name](quasarConf),
    });
  }));

  const getProperty = argv.path ? (await import('dot-prop')).getProperty : undefined;

  const { inspect } = require('util');

  cfgEntries.forEach((cfgEntry) => {
    let tool;

    if ('configFile' in cfgEntry.object) {
      tool = 'Vite';
    } else if ('swDest' in cfgEntry.object) {
      tool = 'workbox-build';
    } else {
      tool = 'esbuild';
    }

    if (getProperty) {
      cfgEntry.object = getProperty(cfgEntry.object, argv.path) || {};
    }

    console.log();
    log(`Showing "${cfgEntry.name}" config (for ${tool}) with depth of ${depth}`);
    console.log();
    console.log(
      inspect(cfgEntry.object, {
        showHidden: true,
        depth,
        colors: argv.colors,
        compact: false,
      }),
    );
  });

  console.log(`\n  Depth used: ${depth}. You can change it with "-d" / "--depth" parameter.\n`);
})();
