import tailwindConfig from '@theguild/tailwind-config';

export default {
  ...tailwindConfig,
  safelist: ['dark:invert'], // because `dark:invert` not in tsx file but in ts
};
