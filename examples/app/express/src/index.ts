/* eslint-disable no-console */

import express from 'express';

import { buildApp } from './app';

const app = express();

buildApp({
  app,
  async prepare() {
    await import('./modules');
  },
}).then(EnvelopApp => {
  app.use(EnvelopApp.router);

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Express Listening on port ${port}!`);
  });
});
