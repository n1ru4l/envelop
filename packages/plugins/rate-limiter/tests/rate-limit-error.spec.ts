import { RateLimitError } from '../src/rate-limit-error';

test('RateLimitError is an Error', () => {
  expect(new RateLimitError('Some message')).toBeInstanceOf(Error);
});

test('RateLimitError.isRateLimitError is true', () => {
  expect(new RateLimitError('Some message').isRateLimitError).toBe(true);
});
