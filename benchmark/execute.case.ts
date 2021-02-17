/* eslint-disable no-console */
import Benchmark from 'benchmark';
import { parse, execute, print } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { envelop, useLogger, useSchema } from '../packages/core/src';
import { useApolloTracing } from '../packages/plugins/apollo-tracing';
import { ApolloServer } from 'apollo-server';

interface TestResult {
  id: string;
  name: string;
  hz: number;
}

const schema = makeExecutableSchema({
  typeDefs: /* GraphQL */ `
    type Post {
      title: String!
    }
    type Query {
      posts: [Post!]!
    }
  `,
  resolvers: {
    Query: {
      posts: () => [
        {
          title: 'Title',
        },
      ],
    },
  },
});

const document = parse(/* GraphQL */ `
  query posts {
    posts {
      title
    }
  }
`);

const execArgs = {
  schema,
  document,
  contextValue: {},
  operationName: 'posts',
  variableValues: {},
  rootValue: {},
};

const asyncExecute = async args => {
  return await execute(args);
};

const noPlugins = envelop({
  plugins: [useSchema(schema)],
});

const withLogger = envelop({
  plugins: [
    useSchema(schema),
    useLogger({
      logFn: () => null,
    }),
  ],
});

const withApolloTracing = envelop({
  plugins: [useSchema(schema), useApolloTracing()],
});

const as = new ApolloServer({
  schema,
});

const doc = print(execArgs.document);

const suites: Record<string, { name: string; runner: Function }> = {
  'graphql-js': {
    name: 'GraphQL-JS',
    runner: () => asyncExecute(execArgs),
  },
  'no-plugins': {
    name: 'Envelop (no plugins)',
    runner: () => noPlugins().execute(execArgs),
  },
  'with-logger': {
    name: 'Envelop (with useLogger)',
    runner: () => withLogger().execute(execArgs),
  },
  'with-apollo-tracing': {
    name: 'Envelop (with useApolloTracing)',
    runner: () => withApolloTracing().execute(execArgs),
  },
  'apollo-server': {
    name: 'Apollo Server',
    runner: () =>
      as.executeOperation({
        query: doc,
      }),
  },
};

function shuffle(list: string[]) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
}

function sum(testResults: TestResult[]): number {
  return testResults.reduce((total, val) => val.hz + total, 0);
}

let runId = 1;

async function run(onResult: (testResult: TestResult) => void) {
  console.log(`Running benchmarks (${runId++})`);
  return new Promise<void>((resolve, reject) => {
    // add tests
    const suite = new Benchmark.Suite();

    const ids = Object.keys(suites);
    shuffle(ids);

    ids.forEach(id => {
      suite.add(suites[id].name, suites[id].runner, {
        id,
      });
    });

    suite
      .on('cycle', (event: any) => {
        console.log(String(event.target));
        onResult({
          id: event.target.id,
          name: event.target.name,
          hz: event.target.hz,
        });
      })
      .on('error', (error: any) => {
        reject(error);
      })
      .on('complete', () => {
        resolve();
      })
      .run({ async: true, delay: 15, queued: true });
  });
}

async function main() {
  const results: Record<string, TestResult[]> = {};

  function onResult(testResult: TestResult) {
    if (!results[testResult.id]) {
      results[testResult.id] = [];
    }

    results[testResult.id].push(testResult);
  }

  await run(onResult);
  await run(onResult);
  await run(onResult);

  const baseId = 'graphql-js';
  const base = results[baseId];
  const baseTotal = sum(base);
  const baseAverage = baseTotal / base.length;

  function compare(id: string): [string, number] {
    const current = results[id];

    const total = sum(current);
    const average = total / current.length;

    return [current[0].name, Math.round((average / baseAverage) * 100)];
  }

  const averageRecords: Record<string, string> = {};
  let belowThreshold = 0;
  const threshold = 80;

  Object.keys(results)
    .map(compare)
    .sort((a, b) => b[1] - a[1])
    .forEach(([key, value]) => {
      if (value <= threshold) {
        belowThreshold = value;
      }
      averageRecords[key] = `${value}%`;
    });

  console.table(averageRecords);

  if (belowThreshold) {
    throw new Error(`Below threshold: ${belowThreshold} (threshold: ${threshold})`);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
