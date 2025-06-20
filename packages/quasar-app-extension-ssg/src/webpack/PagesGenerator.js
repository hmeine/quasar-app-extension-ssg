import { join, dirname } from "path";
import {
  cyanBright,
  green,
  bold,
  blue,
  yellow,
  red,
} from "chalk";
import { parse: parseHtml } from "node-html-parser";
import appPaths from "@quasar/app-webpack/lib/app-paths.js";
import { log, beastcssLog, warning } from "./helpers/logger.js";
import promisifyRoutes from "./helpers/promisify-routes.js";
import isRouteValid from "./helpers/is-route-valid.js";
import {
  withTrailingSlash,
  withoutTrailingSlash,
} from "./helpers/normalize-slash.js";
import { hasPackage } from "../api.js";

export default class PagesGenerator {
  constructor(quasarConf, renderToString, fs) {
    this.init(quasarConf, renderToString, fs);
  }

  init(quasarConf, renderToString, fs) {
    this.renderToString = renderToString;
    this.fs = fs || require('fs').promises;

    const minifyOptions = hasPackage('@quasar/app-webpack', '>= 3.11.0') ? quasarConf.build.htmlMinifyOptions : quasarConf.__html.minifyOptions;

    this.options = {
      ...quasarConf.ssg,
      vueRouterBase: quasarConf.build.vueRouterBase,
      minifyOptions: minifyOptions ? {
        ...minifyOptions,
        ignoreCustomComments: [/^(\]?|\[?)$/], // avoid client-side hydration error
        conservativeCollapse: true, // avoid client-side hydration error
        minifyCSS: true,
      } : false,
    };

    this.ctx = quasarConf.ctx;

    this.pagesToGenerate = new Set();
    this.skippedPages = new Set();

    if (this.ctx.dev) {
      this.queue = new Set();
      this.queue.push = (route) => this.queue.add(route);
    }

    if (quasarConf.ssg.inlineCriticalCss) {
      const Beastcss = require('beastcss');

      this.beastcss = new Beastcss({
        noscriptFallback: false,
        ...quasarConf.ssg.inlineCriticalCss || {},
        path: quasarConf.ssg.distDir,
        publicPath: quasarConf.build.publicPath,
        logger: this.createBeastcssLogger(),
      });

      this.beastcssLogs = [];
    }
  }

  async initRoutes(serverManifest) {
    const warnings = [];

    let userRoutes = ['/'];
    let appRoutes = ['/'];

    try {
      userRoutes = await promisifyRoutes(this.options.routes);
      userRoutes = userRoutes.map((route) => route
        .split('?')[0]
        .replace(/\/+$/, '')
        .trim());
    } catch (err) {
      err.hint = 'Could not resolve provided routes';

      warnings.push(err);
    }

    if (this.options.includeStaticRoutes !== false) {
      const flatRoutes = require('./helpers/flat-routes');
      const getAppRoutes = require('./helpers/get-app-routes');

      try {
        appRoutes = flatRoutes(await getAppRoutes(serverManifest));
      } catch (err) {
        err.hint = 'Could not get static routes from router';

        warnings.push(err);
      }
    }

    // remove duplicate routes between userRoutes and appRoutes
    // wether trailing slash is present or not
    userRoutes = userRoutes.filter(
      (route) => !appRoutes.includes(withTrailingSlash(route))
        && !appRoutes.includes(withoutTrailingSlash(route)),
    );

    const routes = [...new Set([...userRoutes, ...appRoutes])]
      .filter((route) => !this.isPageExcluded(route));

    return {
      routes,
      warnings,
    };
  }

  async generate(routes) {
    const fastq = require('fastq');
    const errors = [];

    this.queue = fastq.promise(
      this,
      async (route) => {
        try {
          await this.generatePage(route);

          if (this.skippedPages.has(route)) {
            // 404 or redirected
            return;
          }

          log(`Generated page for route "${cyanBright(route)}"`);

          if (this.options.inlineCriticalCss) {
            beastcssLog(this.beastcssLogs[route], 'warn');
            beastcssLog(this.beastcssLogs[route], 'info');
          }
        } catch (e) {
          errors.push(e);

          this.queue.killAndDrain();
        }
      },
      this.options.concurrency,
    );

    // https://ajahne.github.io/blog/javascript/2018/05/10/javascript-timers-minimum-delay.html
    if (this.options.interval > 0) {
      this.queue.saturated = async () => {
        this.queue.pause();

        await new Promise((resolve) => { setTimeout(resolve, this.options.interval); });

        this.queue.resume();

        if (this.queue.length() > 0) {
          await this.queue.saturated();
        }
      };
    }

    routes.forEach((route) => {
      // Add route to the tracked pages to generate (for crawler)
      this.pagesToGenerate.add(route);

      // push route to queue
      this.queue.push(route);
    });

    // waiting for queue to be fully processed
    await this.queue.drained();

    if (this.options.inlineCriticalCss) {
      this.beastcss.clear();
    }

    return { errors };
  }

  async generatePage(route) {
    let html;

    html = await this.renderPage(route);

    if (html === null) {
      this.skippedPages.add(route);

      return;
    }

    if (this.options.crawler) {
      this.crawl(html);
    }

    if (this.options.inlineCriticalCss) {
      html = await this.inlineCriticalCss(html, route);
    }

    if (typeof this.options.onRouteRendered === 'function') {
      try {
        html = await this.options.onRouteRendered(
          html,
          route,
          this.ctx.prod ? this.options.distDir : appPaths.resolve.app('dist'),
        );
      } catch (e) {
        e.hint = `Could not process "onRouteRendered" hook for route "${bold(route)}"`;

        throw e;
      }
    }

    if (this.options.minify !== false) {
      const { minify } = require('html-minifier-terser');

      try {
        html = await minify(html, this.options.minifyOptions);
      } catch (e) {
        e.hint = `Could not minify html string of pre-rendered page for route "${green(route)}"`;

        throw e;
      }
    }

    const dest = join(this.ctx.prod ? this.options.distDir : appPaths.resolve.app('dist'), route, 'index.html');

    await this.fs.mkdir(dirname(dest), { recursive: true });

    await this.fs.writeFile(dest, html, 'utf8');
  }

  async renderPage(route) {
    const ssrContext = {
      req: { headers: {}, url: route },
      res: {},
    };

    try {
      return await this.renderToString(ssrContext);
    } catch (e) {
      if (e.url) {
        const redirectedRoute = decodeURI(e.url);

        if (this.shouldGeneratePage(redirectedRoute)) {
          if (this.ctx.dev) {
            log(`New route ${green(redirectedRoute)} found. Redirected from the route ${green(route)}`);
          }

          this.pagesToGenerate.add(redirectedRoute);

          this.queue.push(redirectedRoute);
        }

        return null;
      }

      if (e.code === 404) {
        warning(`Route not found: "${bold(route)}".`, 'WARN');

        return null;
      }

      e.hint = `Could not pre-render page for route ${bold(route)}`;

      throw e;
    }
  }

  isPageExcluded(route) {
    return this.options.exclude.some((regex) => {
      if (typeof regex === 'string') {
        return regex === route;
      }
      return regex.test(route);
    });
  }

  shouldGeneratePage(route) {
    if (!isRouteValid(route)) {
      return false;
    }

    if (this.isPageExcluded(route)) {
      return false;
    }

    return !this.pagesToGenerate.has(route);
  }

  crawl(html) {
    parseHtml(html)
      .querySelectorAll('a')
      .forEach((el) => {
        const sanitizedHref = (el.getAttribute('href') || '')
          .replace(this.options.vueRouterBase, '/')
          .split('?')[0]
          .split('#')[0]
          .replace(/\/+$/, '')
          .trim();

        const foundRoute = decodeURI(sanitizedHref);

        if (this.shouldGeneratePage(foundRoute)) {
          if (this.ctx.dev) {
            log(`Crawler found new route ${green(foundRoute)}`);
          }

          this.pagesToGenerate.add(foundRoute);

          this.queue.push(foundRoute);
        }
      });
  }

  async inlineCriticalCss(html, route) {
    this.beastcssLogs[route] = [];

    try {
      return await this.beastcss.process(html, route);
    } catch (e) {
      e.hint = `Could not inline critical css of pre-rendered page for route "${green(route)}"`;

      throw e;
    }
  }

  createBeastcssLogger() {
    const logger = {};

    const getColor = (level) => {
      if (level === 'info') {
        return blue;
      }

      if (level === 'warn') {
        return yellow;
      }

      return red;
    };

    ['info', 'warn', 'error', 'trace', 'debug'].forEach((level) => {
      logger[level] = (msg, route) => this.beastcssLogs[route].push({
        level,
        msg,
        color: getColor(level),
      });
    });

    return logger;
  }
};
