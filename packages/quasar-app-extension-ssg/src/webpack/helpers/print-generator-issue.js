import { getError, getWarning } from "./logger.js";

function display(errors, severity, titleFn) {
  const summary = `${errors.length} ${severity}${errors.length > 1 ? 's' : ''}`;
  const printLog = console[severity === 'error' ? 'error' : 'warn'];

  errors.forEach((err) => {
    printLog(titleFn(err.hint));
    printLog();

    printLog(err);
  });

  printLog();

  return summary;
}

export function printGeneratorErrors(errors) {
  return display(errors, 'error', (title) => getError(title));
};

export function printGeneratorWarnings(warnings) {
  return display(warnings, 'warning', (title) => getWarning(title));
};
