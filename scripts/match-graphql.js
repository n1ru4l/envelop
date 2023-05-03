const { writeFileSync } = require('fs');
const { resolve } = require('path');
const { argv, cwd } = require('process');

const pkgPath = resolve(cwd(), './package.json');

const pkg = require(pkgPath);

const version = argv[2];

if (pkg.pnpm.overrides.graphql.startsWith(version)) {
  // eslint-disable-next-line no-console
  console.info(`GraphQL v${version} is match! Skipping.`);
  process.exit(0);
}

const npmVersion = version.includes('-') ? version : `^${version}`;
pkg.pnpm.overrides.graphql = npmVersion;
pkg.devDependencies.graphql = npmVersion;

writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf8');
