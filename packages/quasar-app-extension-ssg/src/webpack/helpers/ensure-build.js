import { posix, resolve } from "path";
import { existsSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import appPaths from "@quasar/app-webpack/lib/app-paths.js";
import { log } from "./logger.js";
import { makeSnapshot, compareSnapshots } from "./snapshot.js";
import {
  quasarVersion, cliAppVersion, ssgVersion, quasarExtrasVersion,
} from "./banner.js";

export default async function ensureBuild(quasarConfFile) {
  const { quasarConf } = quasarConfFile;
  const options = quasarConf.ssg;

  if (options.cache === false || quasarConfFile.opts['force-build']) {
    await require('../build')(quasarConfFile);

    return;
  }

  // Take a snapshot of current project
  const snapshotOptions = {
    rootDir: appPaths.appDir,
    ignore: options.cache.ignore.map(posix.normalize),
    globbyOptions: options.cache.globbyOptions,
  };

  const currentBuildSnapshot = await makeSnapshot(snapshotOptions);

  // Current build meta
  const currentBuild = {
    quasarVersion,
    cliAppVersion,
    quasarExtrasVersion,
    ssgVersion,
    ssr: quasarConf.ssr,
    snapshot: currentBuildSnapshot,
  };

  // Check if build can be skipped
  const quasarBuildFile = resolve(options.buildDir, 'build.json');

  if (existsSync(quasarBuildFile)) {
    // fast alternative to JSON.parse()
    const { destr } = require('destr');
    const previousBuild = destr(await readFile(quasarBuildFile, 'utf-8')) || {};

    // Quick diff
    let needBuild = false;

    const fields = Object.keys(currentBuild).filter((field) => field !== 'snapshot');

    needBuild = fields.some((field) => {
      if (JSON.stringify(previousBuild[field]) !== JSON.stringify(currentBuild[field])) {
        log(`Doing webpack rebuild because ${field} changed`);

        return true;
      }

      return false;
    });

    if (!needBuild) {
      // Full snapshot diff
      log('Comparing previous build with current build...');

      const changed = compareSnapshots(previousBuild.snapshot, currentBuild.snapshot);

      if (!changed) {
        log('Skipping webpack build as no changes detected');

        return;
      }

      log(`Doing webpack rebuild because ${changed} modified`);
    }
  }

  await require('../build')(quasarConfFile);

  // Write build.json
  await writeFile(quasarBuildFile, JSON.stringify(currentBuild, null, 2), 'utf-8');
};
