/// @ts-check
import { check } from 'k6';
import { graphql, checkNoErrors } from './utils.js';
import { Trend } from 'k6/metrics';

const trace = {
  parse: new Trend('graphql_parse', true),
  validate: new Trend('graphql_validate', true),
  context: new Trend('graphql_context', true),
  execute: new Trend('graphql_execute', true),
};

export const options = {
  vus: 5,
  duration: '10s',
  thresholds: {
    no_errors: ['rate=1.0'],
    expected_result: ['rate=1.0'],
    http_req_waiting: ['p(95)<=10'],
    http_req_duration: ['p(95)<=10'],
    graphql_execute: ['p(95)<=1'],
    graphql_context: ['p(95)<=1'],
    graphql_validate: ['p(95)<=1'],
    graphql_parse: ['p(95)<=1'],
  },
};

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

  // trace.execute.add();
  trace.parse.add(res.json().extensions.k6_parse);
  trace.validate.add(res.json().extensions.k6_validate);
  trace.context.add(res.json().extensions.k6_context);
  trace.execute.add(res.json().extensions.k6_execute);

  check(res, {
    no_errors: checkNoErrors,
    expected_result: resp => 'id' in resp.json().data.me,
  });
}
