/* eslint-disable no-console */

import { createServer } from 'http';

import { buildApp } from './app';

const server = createServer((req, res) => {
  EnvelopApp.requestHandler(req, res);
});

const EnvelopApp = buildApp({
  async prepare() {
    await import('./modules');
  },
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`HTTP Listening on port ${port}!`);
});
