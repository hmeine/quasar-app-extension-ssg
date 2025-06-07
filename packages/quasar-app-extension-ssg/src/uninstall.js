import { engine, ssgDeps } from "./api.js";
/** @type { import('<%= engine %>/lib/app-paths')} */
const appPaths = require(`${engine}/lib/app-paths`);
const appDevDependencies = Object.keys(require(appPaths.resolve.app('package.json')).devDependencies);


/**
 * Quasar App Extension uninstall script
 *
 * Docs: https://quasar.dev/app-extensions/development-guide/uninstall-api
 * API: https://github.com/quasarframework/quasar/blob/master/app/lib/app-extension/UninstallAPI.js
 */
export default async function uninstall(api) {
  api.removePath('src/ssg-flag.d.ts');

  const depsToUninstall = Object.values(ssgDeps)
    .flat()
    .filter((dep) => appDevDependencies.includes(dep));

  if (depsToUninstall.length > 0) {
    /** @type { import('<%= engine %>/lib/helpers/node-packager')} */
    const nodePackager = require(`${engine}/lib/helpers/node-packager`);

    nodePackager.uninstallPackage(depsToUninstall, {
      displayName: 'SSG dependencies',
    });
  }
};
