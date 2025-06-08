import {
  cyan, yellow, bgYellow, black,
} from "kolorist";
import logger from "@quasar/app-vite/cli/lib/logger";

export { dot, clearConsole, log, fatal, info, warning, progress } from "@quasar/app-vite/cli/lib/logger";

/**
 * Pills
 */

const warningPill = (msg) => bgYellow(black(` ${msg} `));

/**
 * Main approach - App CLI related
 */

const banner = `App ${logger.dot}`;
const yellowBanner = yellow(banner);

export function beastcssLog(messages, level) {
  if (!Array.isArray(messages)) {
    return;
  }

  const color = level === 'info' ? cyan : yellow;

  messages.forEach(({ level: msgLevel, msg }) => {
    if (msgLevel === level) {
      logger[level](color(`[Beastcss] ${msg}`));
    }
  });
};

export function warn(msg, pill) {
  if (msg !== void 0) {
    const pillBanner = pill !== void 0
      ? `${warningPill(pill)} `
      : '';

    console.warn(` ${yellowBanner} ⚠️  ${pillBanner}${msg}`);
  } else {
    console.warn();
  }
};
