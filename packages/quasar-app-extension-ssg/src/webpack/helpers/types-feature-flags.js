import { dirname, join, resolve } from "path";
import { existsSync } from "fs";
import { copySync } from "fs-extra";
import appPaths from "@quasar/app-webpack/lib/app-paths.js";
import getMode from "@quasar/app-webpack/lib/mode/index.js";
import { log } from "./logger.js";

function getStoreFlagPath(storeIndexPath) {
  return join(dirname(storeIndexPath), 'store-flag.d.ts');
}


export default function regenerateTypesFeatureFlags(quasarConf) {
  // Flags must be available even in pure JS codebases,
  //    because boot and configure wrappers functions files will
  //    provide autocomplete based on them also to JS users
  // Flags files should be copied over, for every enabled mode,
  //    every time `quasar ssg dev` and `quasar ssg generate` are run:
  //    this automatize the upgrade for existing codebases
  [
    'pwa',
    'cordova',
    'capacitor',
    'ssr',
    'store',
    'bex',
    'ssg',
  ].forEach((feature) => {
    const [isFeatureInstalled, sourceFlagPath, destFlagPath] = feature === 'store'
      ? [
        quasarConf.store,
        appPaths.resolve.cli('templates/store/store-flag.d.ts'),
        appPaths.resolve.app(getStoreFlagPath(quasarConf.sourceFiles.store)),
      ]
      : [
        feature === 'ssg' ? true : getMode(feature).isInstalled,
        feature === 'ssg' ? resolve(__dirname, '../../ssg-flag.d.ts') : appPaths.resolve.cli(`templates/${feature}/${feature}-flag.d.ts`),
        feature === 'ssg' ? appPaths.resolve.src('ssg-flag.d.ts') : appPaths.resolve[feature](`${feature}-flag.d.ts`),
      ];

    if (isFeatureInstalled && !existsSync(destFlagPath)) {
      copySync(sourceFlagPath, destFlagPath);
      log(`'${feature}' feature flag was missing and has been regenerated`);
    }
  });
};
