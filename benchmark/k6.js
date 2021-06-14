/// @ts-check
import { check } from 'k6';
import { graphql, checkNoErrors } from './utils.js';
import { Trend } from 'k6/metrics';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import { githubComment } from './github.js';

const trace = {
  parse: new Trend('graphql_parse', true),
  validate: new Trend('graphql_validate', true),
  context: new Trend('graphql_context', true),
  execute: new Trend('graphql_execute', true),
};

export const options = {
  vus: 10,
  duration: '60s',
  thresholds: {
    no_errors: ['rate=1.0'],
    expected_result: ['rate=1.0'],
    http_req_duration: ['p(95)<=25'],
    graphql_execute: ['p(95)<=5'],
    graphql_context: ['p(95)<=5'],
    graphql_validate: ['p(95)<=5'],
    graphql_parse: ['p(95)<=5'],
  },
};

export function handleSummary(data) {
  if (!__ENV.GITHUB_TOKEN) {
    return;
  }

  githubComment(data, {
    token: __ENV.GITHUB_TOKEN,
    commit: __ENV.GITHUB_SHA,
    org: 'dotansimha',
    repo: 'envelop',
    renderTitle() {
      return 'Benchmark Failed';
    },
    renderMessage({ checks, thresholds }) {
      return [
        thresholds.failures
          ? '**Performance regression detected**: it seems like your Pull Request adds some extra latency to the GraphQL requests.'
          : '',
        checks.failures ? '**Failed assertions detected**: some GraphQL operations included in the loadtest are failing.' : '',
        `> If the performance regression is expected, please increase the failing threshold.`,
      ].join('\n');
    },
  });

  return {
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

export default function () {
  const res = graphql({
    query: /* GraphQL */ `
      query me {
        me {
          id
        }
      }
    `,
    variables: {},
    operationName: 'me',
  });

  const tracingData = res.json().extensions.envelopTracing;

  tracingData.parse && trace.parse.add(tracingData.parse);
  tracingData.validate && trace.validate.add(tracingData.validate);
  tracingData.contextFactory && trace.context.add(tracingData.contextFactory);
  tracingData.execute && trace.execute.add(tracingData.execute);
  tracingData.subscribe && trace.subscribe.add(tracingData.subscribe);

  check(res, {
    no_errors: checkNoErrors,
    expected_result: resp => 'id' in resp.json().data.me,
  });
}
