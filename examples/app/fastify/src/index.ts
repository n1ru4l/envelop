import Fastify from 'fastify';

import { buildApp } from './app';

const fastifyApp = Fastify({
  logger: true,
});

const EnvelopApp = buildApp({
  async prepare() {
    await import('./modules');
  },
});

fastifyApp.register(EnvelopApp.plugin, {
  logLevel: 'error',
});

fastifyApp.listen(process.env.PORT || 3000);
