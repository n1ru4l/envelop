declare module 'graphql/jsutils/isAsyncIterable.js' {
  function isAsyncIterable(input: unknown): input is AsyncIterableIterator<any>;
  export default isAsyncIterable;
}
