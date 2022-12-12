const config = require('@theguild/tailwind-config');

module.exports = {
  ...config,
  safelist: ['dark:invert'], // because `dark:invert` not in tsx file but in ts
};
