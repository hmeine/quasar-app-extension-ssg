/* eslint-disable no-param-reassign */
import compileTemplate from "lodash/template.js";

function injectSsrRuntimeInterpolation(html) {
  return html
    .replace(
      /(<html[^>]*)(>)/i,
      (found, start, end) => {
        let matches;

        matches = found.match(/\sdir\s*=\s*['"]([^'"]*)['"]/i);
        if (matches) {
          start = start.replace(matches[0], '');
        }

        matches = found.match(/\slang\s*=\s*['"]([^'"]*)['"]/i);
        if (matches) {
          start = start.replace(matches[0], '');
        }

        return `${start} {{ _meta.htmlAttrs }}${end}`;
      },
    )
    .replace(
      /(<head[^>]*)(>)/i,
      (_, start, end) => `${start}${end}{{ _meta.headTags }}`,
    )
    .replace(
      /(<\/head>)/i,
      (_, tag) => `{{ _meta.resourceHints }}{{ _meta.resourceStyles }}{{ _meta.endingHeadTags || '' }}${tag}`,
    )
    .replace(
      /(<body[^>]*)(>)/i,
      (found, start, end) => {
        let classes = '{{ _meta.bodyClasses }}';

        const matches = found.match(/\sclass\s*=\s*['"]([^'"]*)['"]/i);

        if (matches) {
          if (matches[1].length > 0) {
            classes += ` ${matches[1]}`;
          }
          start = start.replace(matches[0], '');
        }

        return `${start} class="${classes.trim()}" {{ _meta.bodyAttrs }}${end}{{ _meta.bodyTags }}`;
      },
    )
    .replace(
      '<div id="q-app"></div>',
      '<div id="q-app">{{ _meta.resourceApp }}</div>{{ _meta.resourceScripts }}',
    );
}

/**
 * forked and adapted from html-webpack-plugin as
 * it's no longer exporting this method
 */
function htmlTagObjectToString(tagDefinition) {
  const attributes = Object.keys(tagDefinition.attributes || {})
    .filter((attributeName) => tagDefinition.attributes[attributeName] === '' || tagDefinition.attributes[attributeName])
    .map((attributeName) => (
      tagDefinition.attributes[attributeName] === true
        ? attributeName
        : `${attributeName}="${tagDefinition.attributes[attributeName]}"`
    ));

  return `<${[tagDefinition.tagName].concat(attributes).join(' ')}>
${tagDefinition.innerHTML || ''}${tagDefinition.voidTag ? '' : `</${tagDefinition.tagName}>`}`;
}

function injectVueDevtools(html, { host, port }, nonce = '') {
  const scripts = (
    `<script${nonce}>window.__VUE_DEVTOOLS_HOST__='${host}';window.__VUE_DEVTOOLS_PORT__='${port}';</script>`
    + `<script src="http://${host}:${port}"></script>`
  );

  return html.replace(
    /(<\/head>)/i,
    (_, tag) => `${scripts}${tag}`,
  );
}

const htmlRegExp = /(<html[^>]*>)/i;
const headRegExp = /(<\/head\s*>)/i;
const bodyRegExp = /(<\/body\s*>)/i;

/**
 * forked and adapted from html-webpack-plugin as
 * it's no longer exporting this method
 */
function injectAssetsIntoHtml(html, assetTags) {
  const body = assetTags.bodyTags.map((entry) => htmlTagObjectToString(entry));
  const head = assetTags.headTags.map((entry) => htmlTagObjectToString(entry));

  if (body.length) {
    if (bodyRegExp.test(html)) {
      // Append assets to body element
      html = html.replace(bodyRegExp, (match) => body.join('') + match);
    } else {
      // Append scripts to the end of the file if no <body> element exists:
      html += body.join('');
    }
  }

  if (head.length) {
    // Create a head tag if none exists
    if (!headRegExp.test(html)) {
      if (!htmlRegExp.test(html)) {
        html = `<head></head>${html}`;
      } else {
        html = html.replace(htmlRegExp, (match) => `${match}<head></head>`);
      }
    }

    // Append assets to head element
    html = html.replace(headRegExp, (match) => head.join('') + match);
  }

  return html;
}

export function getIndexHtml(template, cfg) {
  const compiled = compileTemplate(template);

  let html = compiled(cfg.htmlVariables);

  const data = { bodyTags: [], headTags: [] };

  if (cfg.ctx.mode.pwa) {
    const { fillPwaTags } = require('../plugins/html-pwa');

    fillPwaTags(data, cfg);
  }

  if (data.bodyTags.length > 0 || data.headTags.length > 0) {
    html = injectAssetsIntoHtml(html, data);
  }

  if (cfg.build.appBase) {
    const { fillBaseTag } = require('../plugins/html-addons');

    html = fillBaseTag(html, cfg.build.appBase);
  }

  html = injectSsrRuntimeInterpolation(html);

  // should be dev only
  if (cfg.__vueDevtools !== false) {
    html = injectVueDevtools(html, cfg.__vueDevtools, '{{ typeof nonce !== \'undefined\' ? \' nonce="\' + nonce + \'"\' : \'\' }}');
  }

  return compileTemplate(html, { interpolate: /{{([\s\S]+?)}}/g });
};
