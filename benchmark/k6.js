import { check } from 'k6';
import { graphql, checkNoErrors } from './utils.js';
import { Trend } from 'k6/metrics';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import { githubComment } from './github.js';

const DURATION = 10;
const VUS = 10;

function buildOptions(scenarioToThresholdsMap) {
  const result = {
    scenarios: {},
    thresholds: {},
  };

  let index = 0;

  for (const [scenario, thresholds] of Object.entries(scenarioToThresholdsMap)) {
    result.scenarios[scenario] = {
      executor: 'constant-vus',
      exec: 'run',
      startTime: DURATION * index + 's',
      vus: VUS,
      duration: DURATION + 's',
      env: { MODE: scenario },
      tags: { mode: scenario },
    };

    const t = Object.keys(thresholds || {}).reduce((prev, key) => {
      return Object.assign({}, prev, { [`${key}{mode:${scenario}}`]: thresholds[key] });
    }, {});

    Object.assign(result.thresholds, t);
    index++;
  }

  return result;
}

const trace = {
  init: new Trend('envelop_init', true),
  parse: new Trend('graphql_parse', true),
  validate: new Trend('graphql_validate', true),
  context: new Trend('graphql_context', true),
  execute: new Trend('graphql_execute', true),
  total: new Trend('envelop_total', true),
};

export const options = buildOptions({
  'graphql-js': {
    no_errors: ['rate=1.0'],
    expected_result: ['rate=1.0'],
    http_req_duration: ['p(95)<=28'],
    graphql_execute: ['p(95)<=2'],
    graphql_context: ['p(95)<=1'],
    graphql_validate: ['p(95)<=1'],
    graphql_parse: ['p(95)<=1'],
    envelop_init: ['p(95)<=1'],
    envelop_total: ['p(95)<=2'],
  },
  'envelop-just-cache': {
    no_errors: ['rate=1.0'],
    expected_result: ['rate=1.0'],
    http_req_duration: ['p(95)<=20'],
    graphql_execute: ['p(95)<=1'],
    graphql_context: ['p(95)<=1'],
    graphql_validate: ['p(95)<=1'],
    graphql_parse: ['p(95)<=1'],
    envelop_init: ['p(95)<=1'],
    envelop_total: ['p(95)<=1'],
  },
  'prom-tracing': {
    no_errors: ['rate=1.0'],
    expected_result: ['rate=1.0'],
    http_req_duration: ['p(95)<=45'],
    graphql_execute: ['p(95)<=4'],
    graphql_context: ['p(95)<=1'],
    graphql_validate: ['p(95)<=1'],
    graphql_parse: ['p(95)<=1'],
    envelop_init: ['p(95)<=1'],
    envelop_total: ['p(95)<=4'],
  },
  'envelop-cache-and-no-internal-tracing': {
    no_errors: ['rate=1.0'],
    expected_result: ['rate=1.0'],
    http_req_duration: ['p(95)<=15'],
  },
  'envelop-cache-jit': {
    no_errors: ['rate=1.0'],
    expected_result: ['rate=1.0'],
    http_req_duration: ['p(95)<=14'],
    graphql_execute: ['p(95)<=1'],
    graphql_context: ['p(95)<=1'],
    graphql_validate: ['p(95)<=1'],
    graphql_parse: ['p(95)<=1'],
    envelop_init: ['p(95)<=1'],
    envelop_total: ['p(95)<=1'],
  },
});

export function handleSummary(data) {
  githubComment(data, {
    token: __ENV.GITHUB_TOKEN,
    commit: __ENV.GITHUB_SHA,
    pr: __ENV.GITHUB_PR,
    org: 'dotansimha',
    repo: 'envelop',
    renderTitle({ passes }) {
      return passes ? '✅ Benchmark Results' : '❌ Benchmark Failed';
    },
    renderMessage({ passes, checks, thresholds }) {
      const result = [];

      if (thresholds.failures) {
        result.push(
          `**Performance regression detected**: it seems like your Pull Request adds some extra latency to the GraphQL requests, or to envelop runtime.`
        );
      }

      if (checks.failures) {
        result.push('**Failed assertions detected**: some GraphQL operations included in the loadtest are failing.');
      }

      if (!passes) {
        result.push(`> If the performance regression is expected, please increase the failing threshold.`);
      }

      return result.join('\n');
    },
  });

  return {
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

export function run() {
  const res = graphql({
    query: /* GraphQL */ `
      query authors {
        authors {
          id
          name
          company
          books {
            id
            name
            numPages
          }
        }
      }
    `,
    variables: {},
    operationName: 'authors',
  });

  const tracingData = (res.json().extensions || {}).envelopTracing || {};
  tracingData.parse && trace.parse.add(tracingData.parse);
  tracingData.validate && trace.validate.add(tracingData.validate);
  tracingData.contextFactory && trace.context.add(tracingData.contextFactory);
  tracingData.execute && trace.execute.add(tracingData.execute);
  tracingData.subscribe && trace.subscribe.add(tracingData.subscribe);
  tracingData.init && trace.init.add(tracingData.init);

  const total = [
    tracingData.parse,
    tracingData.validate,
    tracingData.contextFactory,
    tracingData.execute,
    tracingData.subscribe,
    tracingData.init,
  ]
    .filter(Boolean)
    .reduce((a, b) => a + b, 0);

  trace.total.add(total);

  check(res, {
    no_errors: checkNoErrors,
    expected_result: resp => 'id' in resp.json().data.authors[0],
  });
}
