declare module 'graphql/jsutils/isAsyncIterable' {
  function isAsyncIterable(input: unknown): input is AsyncIterableIterator<unknown>;
  export default isAsyncIterable;
}
