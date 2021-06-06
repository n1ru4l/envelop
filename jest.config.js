const { pathsToModuleNameMapper } = require('ts-jest/utils');
const { compilerOptions } = require('./tsconfig.json');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  modulePathIgnorePatterns: ['/dist/'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/.next'],
  coveragePathIgnorePatterns: ['node_modules', '/.next'],
  globals: {
    'ts-jest': {
      diagnostics: false,
    },
  },
  globalSetup: './packages/app/setup-test.js',
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>/' }),
};
