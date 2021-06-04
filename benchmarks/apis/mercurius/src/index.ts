import Fastify from 'fastify';
import mercurius from 'mercurius';
import { codegenMercurius } from 'mercurius-codegen';
import { requireEnv } from 'require-env-variable';
import { schema } from 'envelop-bench';
const app = Fastify({
  logger: process.env.NODE_ENV !== 'production',
});

process.env.CACHE && console.log('Cache enabled with Mercurius!');
process.env.JIT && console.log('Jit Enabled with Mercurius!');

app.register(mercurius, {
  schema,
  jit: process.env.JIT ? 1 : -1,
  cache: !!process.env.CACHE,
});

app.listen(requireEnv('PORT').PORT);

codegenMercurius(app, {
  targetPath: 'src/mercurius.generated.ts',
});
