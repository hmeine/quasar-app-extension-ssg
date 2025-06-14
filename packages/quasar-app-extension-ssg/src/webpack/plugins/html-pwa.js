import { getHooks, createHtmlTagObject } from "html-webpack-plugin";

function fillPwaTags(data, {
  pwa: {
    manifest, metaVariables, metaVariablesFn, useCredentials,
  },
}) {
  data.headTags.push(
    // Add to home screen for Android and modern mobile browsers
    createHtmlTagObject('link', {
      rel: 'manifest',
      href: 'manifest.json',
      ...(useCredentials ? { crossorigin: 'use-credentials' } : {}),
    }),
  );

  if (typeof metaVariablesFn === 'function') {
    const tags = metaVariablesFn(manifest);

    if (Array.isArray(tags)) {
      tags.forEach((tag) => {
        data.headTags.push(
          createHtmlTagObject(tag.tagName, tag.attributes),
        );
      });
    }
  } else {
    data.headTags.push(
      createHtmlTagObject('meta', {
        name: 'theme-color',
        content: manifest.theme_color,
      }),

      // Add to home screen for Safari on iOS
      createHtmlTagObject('meta', {
        name: 'apple-mobile-web-app-capable',
        content: metaVariables.appleMobileWebAppCapable,
      }),
      createHtmlTagObject('meta', {
        name: 'apple-mobile-web-app-status-bar-style',
        content: metaVariables.appleMobileWebAppStatusBarStyle,
      }),
      createHtmlTagObject('meta', {
        name: 'apple-mobile-web-app-title',
        content: manifest.name,
      }),
      createHtmlTagObject('link', {
        rel: 'apple-touch-icon',
        href: metaVariables.appleTouchIcon120,
      }),
      createHtmlTagObject('link', {
        rel: 'apple-touch-icon',
        sizes: '152x152',
        href: metaVariables.appleTouchIcon152,
      }),
      createHtmlTagObject('link', {
        rel: 'apple-touch-icon',
        sizes: '167x167',
        href: metaVariables.appleTouchIcon167,
      }),
      createHtmlTagObject('link', {
        rel: 'apple-touch-icon',
        sizes: '180x180',
        href: metaVariables.appleTouchIcon180,
      }),
      createHtmlTagObject('link', {
        rel: 'mask-icon',
        href: metaVariables.appleSafariPinnedTab,
        color: manifest.theme_color,
      }),

      // Add to home screen for Windows
      createHtmlTagObject('meta', {
        name: 'msapplication-TileImage',
        content: metaVariables.msapplicationTileImage,
      }),
      createHtmlTagObject('meta', {
        name: 'msapplication-TileColor',
        content: metaVariables.msapplicationTileColor,
      }),
    );
  }
}

class HtmlPwaPlugin {
  constructor(cfg) {
    this.cfg = cfg || {};
  }

  apply(compiler) {
    compiler.hooks.compilation.tap('webpack-plugin-html-pwa', (compilation) => {
      const hooks = getHooks(compilation);

      hooks.afterTemplateExecution.tapPromise('webpack-plugin-html-pwa', async (data) => {
        fillPwaTags(data, this.cfg);

        return data;
      });
    });
  }
};

export { fillPwaTags, HtmlPwaPlugin as plugin };
