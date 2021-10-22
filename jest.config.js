module.exports = {
  testEnvironment: 'node',
  modulePathIgnorePatterns: ['/dist/'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  transform: {
    '^.+\\.(t|j)s?$': [
      '@swc-node/jest',
      {
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        strict: true,
        jsc: {
          minify: false,
        },
      },
    ],
  },
  // Match paths from tsconfig.json
  moduleNameMapper: {
    '@envelop/core': '<rootDir>/packages/core/src/index.ts',
    '@envelop/testing': '<rootDir>/packages/testing/src/index.ts',
    '@envelop/types': '<rootDir>/packages/types/src/index.ts',
    '@envelop/(.*)$': '<rootDir>/packages/plugins/$1/src/index.ts',
  },
};
