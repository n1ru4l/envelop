import { compileMemfs } from '@n1ru4l/bundle-anywhere';

const schemaFile = `
import { buildSchema } from "graphql";

export const schema = buildSchema(/* GraphQL */ \`
  type Query {
    foo: String!
  }
\`)
`;

const envelopFile = `
import { envelop, useSchema } from "@envelop/core";
import { schema } from "./schema"

const getEnveloped = envelop({
  plugins: [useSchema(schema)]
});

export { getEnveloped }
`;

const indexFile = `
import { GraphQLError } from "graphql";
import { getEnveloped } from "./envelop";

addEventListener('message', async event => {
  try {
    const proxy = getEnveloped({});
    const document = proxy.parse(event.data.payload.query)
    const validationErrors = proxy.validate(proxy.schema, document);

    if (validationErrors.length > 0) {
      postMessage({ ...event.data, type: "execute-result", result: JSON.stringify({ errors: validationErrors }) })
      return
    }
    const contextValue = await proxy.contextFactory()
    const result = await proxy.execute({
      document,
      schema: proxy.schema,
      contextValue,
    })
    postMessage({ ...event.data, type: "execute-result", result: JSON.stringify(result) })
  } catch (err) {
    if (err instanceof GraphQLError === false) {
      err = new GraphQLError(err.stack)
    }
    postMessage({ ...event.data, type: "execute-result", result: JSON.stringify({ errors: [err] }) });
  }
});
`;

let envelopWorkerUri: string | null = null;
let envelopWorker: Worker | null = null;

addEventListener('message', async event => {
  if (event.data.type === 'code') {
    if (envelopWorker) {
      envelopWorker.terminate();
      envelopWorker = null;
    }
    if (envelopWorkerUri) {
      URL.revokeObjectURL(envelopWorkerUri);
    }

    const compiler = compileMemfs(
      {
        '/package.json': JSON.stringify({
          name: 'envelop-worker',
          dependencies: {
            '@envelop/core': '^1.6.3',
            graphql: '^16.0.0',
            // TODO: allow list all envelop plugins
          },
        }),
        '/index.ts': indexFile,
        '/envelop.ts': event.data.code ?? envelopFile,
        '/schema.ts': schemaFile,
      },
      {
        input: 'index.ts',
      }
    );

    await compiler.build();
    if (compiler.result?.errors.length) {
      postMessage({ id: event.data.id, type: 'code-error', errors: compiler.result.errors });
      return;
    }

    const result = new Blob([compiler.result!.outputFiles![0].contents.buffer]);
    const url = URL.createObjectURL(result);
    envelopWorker = new Worker(url);
    envelopWorker.onmessage = event => {
      postMessage(event.data);
    };

    postMessage({ id: event.data.id, type: 'code-success' });
  }

  if (event.data.type === 'execute') {
    if (!envelopWorker) {
      postMessage({ id: event.data.id, type: 'execute-error', message: 'No worker' });
      return;
    }
    envelopWorker.postMessage(event.data);
  }
});
