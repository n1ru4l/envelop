/* eslint-disable no-console */

import Koa from 'koa';
import KoaRouter from '@koa/router';

import { buildApp } from './app';

const app = new Koa();

const router = new KoaRouter();

buildApp({
  async prepare() {
    await import('./modules');
  },
  router,
}).then(() => {
  app.use(router.routes()).use(router.allowedMethods());

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Koa Listening on port ${port}!`);
  });
});
