/* eslint-disable */
import 'reflect-metadata';
import fastify from 'fastify';
import { envelop, useLogger, useSchema } from '@envelop/core';
import { parse, validate, execute, subscribe } from 'graphql';
import { Field, ObjectType, buildSchemaSync, ID, Resolver, Query, Arg } from 'type-graphql';
import { getGraphQLParameters, processRequest, renderGraphiQL, sendResult, shouldRenderGraphiQL } from 'graphql-helix';

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

const getEnveloped = envelop({
  parse,
  validate,
  execute,
  subscribe,
  plugins: [
    useSchema(
      buildSchemaSync({
        resolvers: [RecipeResolver],
      })
    ),
    useLogger(),
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

      sendResult(result, res.raw);

      // Tell fastify a response was sent
      res.sent = true;
    }
  },
});

app.listen(3000, () => {
  console.log(`GraphQL server is running.`);
});
