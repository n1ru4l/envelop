const { resolve } = require('path');
const { pathsToModuleNameMapper } = require('ts-jest');
const CI = !!process.env.CI;

const ROOT_DIR = __dirname;
const TSCONFIG = resolve(ROOT_DIR, 'tsconfig.json');
const tsconfig = require(TSCONFIG);

/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  rootDir: ROOT_DIR,
  projects: [
    {
      displayName: 'Standard Tests',
      testMatch: [
        '<rootDir>/**/*.spec.ts',
        '<rootDir>/**/*.spec.js',
        '<rootDir>/**/*.test.ts',
        '<rootDir>/**/*.test.js',
      ],
      testPathIgnorePatterns: ['<rootDir>/packages/plugins/response-cache-cloudflare-kv'],
      restoreMocks: true,
      modulePathIgnorePatterns: ['dist', 'test-assets', 'test-files', 'fixtures', '.bob'],
      moduleNameMapper: pathsToModuleNameMapper(tsconfig.compilerOptions.paths, {
        prefix: `${ROOT_DIR}/`,
      }),
      cacheDirectory: resolve(ROOT_DIR, `${CI ? '' : 'node_modules/'}.cache/jest`),
      resolver: 'bob-the-bundler/jest-resolver',
      setupFilesAfterEnv: ['<rootDir>/jest-setup.js'],
    },
    // Cloudflare plugin tests need very different build settings
    // giving Jest a string as project name will make it rely on jest.config files in the package subfolder
    '<rootDir>/packages/plugins/response-cache-cloudflare-kv',
  ],
  reporters: ['default'],
  collectCoverage: false,
};
