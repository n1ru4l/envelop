/* eslint-disable no-console */
import 'reflect-metadata';
import fastify from 'fastify';
import { envelop, useLogger, useAsyncSchema, useTiming } from '@envelop/core';
import { Field, ObjectType, buildSchema, ID, Resolver, Query, Arg } from 'type-graphql';
import { getGraphQLParameters, processRequest, renderGraphiQL, shouldRenderGraphiQL } from 'graphql-helix';

@ObjectType()
class Recipe {
  @Field(type => ID)
  id: string;

  @Field()
  title: string;

  @Field({ nullable: true })
  description?: string;
}

@Resolver(Recipe)
class RecipeResolver {
  constructor() {}

  @Query(returns => Recipe)
  async recipe(@Arg('id') id: string) {
    return {
      id,
      title: 'Test',
    };
  }

  @Query(returns => [Recipe])
  recipes() {
    return [
      {
        id: '1',
        title: 'test',
      },
    ];
  }
}

// You can also use `buildSchemaSync` and `useSchema` plugin
const getEnveloped = envelop({
  plugins: [
    useAsyncSchema(
      buildSchema({
        resolvers: [RecipeResolver],
      })
    ),
    useLogger(),
    useTiming(),
  ],
});

const app = fastify();

app.route({
  method: ['GET', 'POST'],
  url: '/graphql',
  async handler(req, res) {
    const { parse, validate, contextFactory, execute, schema } = getEnveloped({ req });
    const request = {
      body: req.body,
      headers: req.headers,
      method: req.method,
      query: req.query,
    };

    if (shouldRenderGraphiQL(request)) {
      res.type('text/html');
      res.send(renderGraphiQL({}));
    } else {
      const { operationName, query, variables } = getGraphQLParameters(request);
      const result = await processRequest({
        operationName,
        query,
        variables,
        request,
        schema,
        parse,
        validate,
        execute,
        contextFactory,
      });

      if (result.type === 'RESPONSE') {
        res.status(result.status);
        res.send(result.payload);
      } else {
        // You can find a complete example with GraphQL Subscriptions and stream/defer here:
        // https://github.com/contrawork/graphql-helix/blob/master/examples/fastify/server.ts
        res.send({ errors: [{ message: 'Not Supported in this demo' }] });
      }
    }
  },
});

app.listen(3000, () => {
  console.log(`GraphQL server is running.`);
});
