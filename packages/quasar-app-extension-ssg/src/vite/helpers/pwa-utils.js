import workboxBuild from "workbox-build";
import { progress } from "./logger.js";

export async function buildPwaServiceWorker(
  workboxMode,
  workboxConfig,
) {
  const done = progress(
    workboxMode === 'injectManifest'
      ? 'Injecting the ___ to the custom Service Worker with Workbox in progress...'
      : 'Compiling of the ___ with Workbox in progress...',
    workboxMode === 'injectManifest'
      ? 'Precache Manifest'
      : 'Service Worker',
  );

  await workboxBuild[workboxMode](workboxConfig);

  done(
    workboxMode === 'injectManifest'
      ? 'The ___ has been injected with success'
      : 'The ___ compiled with success',
  );
};
