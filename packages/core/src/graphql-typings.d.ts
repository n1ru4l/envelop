declare module 'graphql/jsutils/isAsyncIterable' {
  function isAsyncIterable(input: unknown): input is AsyncIterable<any>;
  export default isAsyncIterable;
}
