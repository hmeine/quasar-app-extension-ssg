import { green, grey } from "chalk";
import isRouteValid from "./helpers/is-route-valid.js";

export default ({
  app, banner, resolve, generatePage, serve,
}) => {
  app.get(resolve.urlPath('*'), (req, res, next) => {
    const route = resolve.route(req.url);

    if (!req.headers.accept?.includes('text/html') || !isRouteValid(route)) {
      next();

      return;
    }

    generatePage(route)
      .then((isSSG) => {
        console.log(`${banner} GET ${green(req.url)} ${grey(`[${isSSG ? 'SSG' : 'SPA Fallback'}]`)}\n`);

        if (!isSSG) {
          serve.fallback(res);

          return;
        }

        // webpack-dev-server will handle generated static index.html file
        next();
      })
      .catch((err) => {
        serve.error({ err, req, res });
      });
  });
};
