import express from 'express';
import { requireEnv } from 'require-env-variable';

import { graphqlHTTP } from 'express-graphql';
import { schema } from 'envelop-bench';

const app = express();

app.use(
  '/graphql',
  graphqlHTTP({
    schema,
  })
);

app.listen(requireEnv('PORT').PORT);
