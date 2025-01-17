 /**
 * @see https://github.com/lint-staged/lint-staged?tab=readme-ov-file#configuration
 * @type {import("lint-staged").Configuration}
 */
const lintStagedConfig = {
  '**/*.(ts|tsx)': () => 'npx tsc --noEmit',

  '**/*.(ts|tsx|js)': (filenames) => [
    `npx eslint ${filenames.join(' ')}`,
    `npx prettier --write ${filenames.join(' ')}`,
  ],

  '**/*.(md|json)': (filenames) =>
    `npx prettier --write ${filenames.join(' ')}`,
};

module.exports = lintStagedConfig;
