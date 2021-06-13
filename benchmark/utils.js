/// @ts-check
import http from 'k6/http';

const params = {
  headers: {
    'Content-Type': 'application/json',
  },
};

const graphqlEndpoint = `http://${__ENV.GRAPHQL_HOSTNAME || 'localhost'}:5000/graphql`;

export function checkNoErrors(resp) {
  return !('errors' in resp.json());
}

export function graphql({ query, operationName, variables }) {
  return http.post(
    graphqlEndpoint,
    JSON.stringify({
      query,
      operationName,
      variables,
    }),
    params
  );
}
