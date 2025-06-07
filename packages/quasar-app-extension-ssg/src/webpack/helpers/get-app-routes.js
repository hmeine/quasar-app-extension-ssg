import createBundle from "@quasar/ssr-helpers/lib/create-bundle.js";

export default async function getAppRoutes(serverManifest) {
  const { evaluateEntry, rewriteErrorTrace } = createBundle({ serverManifest });

  try {
    const { getRoutesFromRouter } = await evaluateEntry();

    return await getRoutesFromRouter();
  } catch (err) {
    await rewriteErrorTrace(err);

    throw err;
  }
};
