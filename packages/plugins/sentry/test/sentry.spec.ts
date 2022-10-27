import { defaultSkipError } from '../src/index.js';
import { GraphQLError } from 'graphql';

test('defaultSkipError should return true for GraphQLError', () => {
  // Throwing a GraphQLError in GraphQL Yoga v3 results in error masking.
  // The GraphQLError is treated as an expected error.
  // The sentry plugin should follow this logic and do not capture GraphQLError.
  expect(defaultSkipError(new GraphQLError('test', {}))).toBe(true);
});
