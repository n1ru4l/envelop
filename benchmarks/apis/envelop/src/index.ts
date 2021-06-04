import { schema } from 'envelop-bench';
import Fastify from 'fastify';
import { requireEnv } from 'require-env-variable';

import { CreateApp } from '@pablosz/envelop-app/fastify';

const app = Fastify({
  logger: process.env.NODE_ENV !== 'production',
});

process.env.CACHE && console.log('Added Cache Plugins in Envelop');
process.env.JIT && console.log('Added JIT in Envelop');

app.register(
  CreateApp({
    schema,
    jit: !!process.env.JIT,
    cache: !!process.env.CACHE,
    ide: false,
  }).buildApp({}).plugin
);

app.listen(requireEnv('PORT').PORT);
