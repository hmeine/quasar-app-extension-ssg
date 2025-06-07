import { resolve, join, basename } from "path";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  lstatSync,
} from "fs";
import { removeSync } from "fs-extra";
import compileTemplate from "lodash/template.js";
import appPaths from "@quasar/app-vite/lib/app-paths";
const quasarFolder = appPaths.resolve.app('.quasar');

class EntryFilesGenerator {
  #files;

  constructor() {
    const filePaths = [
      resolve(__dirname, './entry/app.js'),
      resolve(__dirname, './entry/client-entry.js'),
      resolve(__dirname, './entry/client-prefetch.js'),
      require.resolve('@quasar/app-vite/templates/entry/quasar-user-options.js'),
      resolve(__dirname, './entry/server-entry.js'),
    ];

    this.#files = filePaths.map((filePath) => {
      const content = readFileSync(
        filePath,
        'utf-8',
      );

      const filename = basename(filePath);

      return {
        filename,
        dest: join(quasarFolder, filename),
        template: compileTemplate(content),
      };
    });
  }

  generate(quasarConf) {
    // ensure .quasar folder
    if (!existsSync(quasarFolder)) {
      mkdirSync(quasarFolder);
    } else if (!lstatSync(quasarFolder).isDirectory()) {
      removeSync(quasarFolder);
      mkdirSync(quasarFolder);
    }

    this.#files.forEach((file) => {
      writeFileSync(file.dest, file.template(quasarConf), 'utf-8');
    });
  }
}

export default () => new EntryFilesGenerator();
