/*
 * Copyright (C) Highsoft AS
 */

/* eslint-disable no-use-before-define, node/no-unsupported-features/node-builtins */

/* *
 *
 *  Imports
 *
 * */

const gulp = require('gulp');
const yargs = require('yargs');
const process = require('node:process');
/* *
 *
 *  Tasks
 *
 * */

/**
 * Builds files of `/ts` folder into `/js` folder.
 *
 * @return {Promise}
 * Promise to keep.
 */
async function scriptsTS() {
    const fsLib = require('./lib/fs'),
        processLib = require('./lib/process');
    const logLib = require('./lib/log');

    const args = yargs(process.argv).argv;

    try {
        processLib.isRunning('scripts-ts', true);
        if (args.masters) {
            const { writeFile, readFile, rm } = require('node:fs/promises');
            const tmpFileName = 'ts/tmp.tsconfig.jsonc';

            try {
                const baseTSConfig = await readFile(
                    'ts/no-masters.tsconfig.jsonc',
                    'utf8'
                );

                const masterFiles = args.masters.split(',');

                const pad = ' '.repeat(8);
                const tmpTSConfig = baseTSConfig.replace(
                    '// %% master files to compile here %%',
                    masterFiles.map(
                        (masterFile, i) => {
                            // Obviously this temporary file has to be properly formatted
                            let JSONArrayString = `"${masterFile}"`;

                            if (i > 0) {
                                JSONArrayString = pad + JSONArrayString;
                            }

                            if (i < masterFiles.length - 1) {
                                JSONArrayString += ',';
                            }
                            return JSONArrayString;
                        }
                    ).join('\n')
                );

                await writeFile(tmpFileName, tmpTSConfig, { force: true });
                await processLib.exec(`npx tsc -P ${tmpFileName}`);
            } finally {
                if (!args.debug) {
                    await rm(tmpFileName).catch(() => {
                        logLib.warn(
                            'Failed to remove temporary tsconfig, likely something else went wrong'
                        );
                    });
                }
            }
        } else {
            fsLib.deleteDirectory('js/', true);

            fsLib.copyAllFiles(
                'ts', 'js', true,
                sourcePath => sourcePath.endsWith('.d.ts')
            );

            await processLib.exec('npx tsc --build ts');

            // Remove Dashboards
            fsLib.deleteDirectory('js/Dashboards/', true);
            fsLib.deleteDirectory('js/DataGrid/', true);

        }
    } finally {
        processLib.isRunning('scripts-ts', false);
    }
}

gulp.task('scripts-ts', gulp.series('scripts-messages', scriptsTS));
