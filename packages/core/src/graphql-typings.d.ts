declare module 'graphql/jsutils/isAsyncIterable' {
  function isAsyncIterable(input: unknown): input is AsyncIterableIterator<any>;
  export default isAsyncIterable;
}
