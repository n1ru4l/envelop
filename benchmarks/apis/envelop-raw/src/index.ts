import Fastify, { FastifySchema } from 'fastify';
import { requireEnv } from 'require-env-variable';
import { schema } from 'envelop-bench';

import { envelop, Plugin, useSchema } from '@envelop/core';
import { useGraphQlJit } from '@envelop/graphql-jit';
import { useParserCache } from '@envelop/parser-cache';
import { useValidationCache } from '@envelop/validation-cache';

const app = Fastify({
  logger: process.env.NODE_ENV !== 'production',
});

const plugins: Plugin<any>[] = [useSchema(schema)];

if (process.env.CACHE) {
  console.log('Added Cache Plugins in Envelop Raw');

  plugins.push(useParserCache(), useValidationCache());
}

if (process.env.JIT) {
  console.log('Added JIT in Envelop Raw');

  plugins.push(useGraphQlJit());
}
const getEnvelop = envelop({
  plugins,
});

const { parse, validate, schema: envelopSchema, execute } = getEnvelop();

const requestProperties = {
  query: {
    type: 'string',
  },
  persisted: {
    type: 'boolean',
  },
  operationName: {
    type: ['string', 'null'],
  },
};

const responseProperties = {
  data: {
    type: ['object', 'null'],
    additionalProperties: true,
  },
  errors: {
    type: 'array',
    items: {
      type: 'object',
      required: ['message'],
      properties: {
        message: { type: 'string' },
        locations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              line: { type: 'integer' },
              column: { type: 'integer' },
            },
          },
        },
        path: {
          type: 'array',
          items: { type: 'string' },
        },
        extensions: {
          type: 'object',
          properties: {
            code: { type: 'string' },
          },
          additionalProperties: true,
        },
      },
    },
  },
};

const postSchema: FastifySchema = {
  body: {
    type: 'object',
    properties: {
      ...requestProperties,
      variables: {
        type: ['object', 'null'],
      },
      extensions: {
        type: 'object',
      },
    },
  },
  response: {
    '2xx': {
      type: 'object',
      properties: responseProperties,
    },
  },
};

const root = {};

app.post(
  '/graphql',
  {
    schema: postSchema,
    attachValidation: true,
  },
  async req => {
    const { query, operationName, variables } = req.body as any;
    const document = parse(query);

    const validationErrors = validate(envelopSchema, document);

    if (validationErrors.length > 0) {
      const err = {
        message: 'ValidationError',
        graphqlErrors: validationErrors,
      };

      throw err;
    }

    return execute(envelopSchema, document, root, {}, variables, operationName);
  }
);

app.listen(requireEnv('PORT').PORT);
