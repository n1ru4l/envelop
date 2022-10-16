import { DocumentNode, ExecutionArgs, print } from 'graphql';
import { Plugin } from '@envelop/core';

const documentStringByDocument = new WeakMap<DocumentNode, string>();

export function useCacheDocumentString<PluginContext extends Record<string, any> = {}>(): Plugin<PluginContext> {
  return {
    onParse({ params: { source } }) {
      return function onParseEnd({ result }) {
        if (result != null && !(result instanceof Error)) {
          documentStringByDocument.set(result, source.toString());
        }
      };
    },
  };
}

export function defaultGetDocumentString(executionArgs: ExecutionArgs): string {
  let documentString = documentStringByDocument.get(executionArgs.document);
  if (documentString == null) {
    documentString = print(executionArgs.document);
    documentStringByDocument.set(executionArgs.document, documentString);
  }
  return documentString;
}
