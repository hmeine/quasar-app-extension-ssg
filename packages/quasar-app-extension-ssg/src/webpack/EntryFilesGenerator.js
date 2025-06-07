import { join, resolve, basename } from "path";
import { readFileSync } from "fs";
import compileTemplate from "lodash/template.js";
import appPaths from "@quasar/app-webpack/lib/app-paths.js";
import Generator from "@quasar/app-webpack/lib/generator.js";
const quasarFolder = appPaths.resolve.app('.quasar');

class EntryFilesGenerator extends Generator {
  constructor(quasarConfFile) {
    super(quasarConfFile);

    const paths = [
      // forked Quasar entries adding full SPA fallback support
      'app.js',
      'client-entry.js',
      'client-prefetch.js',
      // forked Quasar entry exporting routes from router
      'server-entry.js',
      // new entry for ssg
      'ssg-renderer-entry.js',
    ];

    const newFiles = paths.map((file) => {
      const content = readFileSync(
        resolve(__dirname, `./entry/${file}`),
        'utf-8',
      );

      const filename = basename(file);

      return {
        filename,
        dest: join(quasarFolder, filename),
        template: compileTemplate(content),
      };
    });

    this.files = [
      ...newFiles,
      ...this.files.filter(({ filename }) => [
        // keep only these Quasar entries
        'quasar-user-options.js',
      ].includes(filename)),
    ];
  }
};

export default EntryFilesGenerator;
