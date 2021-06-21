/* eslint-disable no-console */
import { Plugin } from '@envelop/types';
import LRU from 'tiny-lru';
import { createHash } from 'crypto';
import { DocumentNode, OperationDefinitionNode, FieldNode, SelectionNode, visit, parse, print } from 'graphql';

type Listener = (typename: string, id?: string | number) => void;

interface Controller {
  purge(typename: string, id?: string | number): void;
  ɵregister(listener: Listener): void;
}

interface Options {
  max?: number;
  ttl?: number;
  controller?: Controller;
}

export function createController(): Controller {
  let listener: (typename: string, id?: string | number) => void = () => {};

  return {
    purge(typename, id) {
      listener(typename, id);
    },
    ɵregister(audience) {
      listener = audience;
    },
  };
}

export const useResponseCache = ({ max = 1000, ttl = undefined, controller }: Options = {}): Plugin => {
  if (controller) {
    controller.ɵregister((typename, id) => {
      purge(typeof id !== 'undefined' ? makeId(typename, id) : typename);
    });
  }

  const cachedResponses = LRU<any>(max, ttl);

  // TODO: when TTL or max size is reached, we need to clean the maps below
  // TODO: Let's maybe use a different LRU cache (with a callback on delete action)
  const entityToResponse = new Map<string, Set<string>>();
  const responseToEnity = new Map<string, Set<string>>();

  function purge(entity: string) {
    if (entityToResponse.has(entity)) {
      const responsesToRemove = entityToResponse.get(entity);

      if (responsesToRemove) {
        responsesToRemove.forEach(responseId => {
          // get entities related to the response
          if (responseToEnity.has(responseId)) {
            responseToEnity.get(responseId)!.forEach(entityId => {
              // remove the response mapping from the entity
              entityToResponse.get(entityId)?.delete(responseId);
            });
            // remove all the entity mappings from the response
            responseToEnity.delete(responseId);
          }
          // remove the response from the cache
          cachedResponses.delete(responseId);
        });
      }
    }
  }

  return {
    onParse(ctx) {
      ctx.setParseFn((source, options) => addTypenameToDocument(parse(source, options)));
    },
    onExecute(ctx) {
      if (isMutation(ctx.args.document)) {
        return {
          onExecuteDone({ result }) {
            const entitiesToRemove = new Set<string>();

            collectEntity(result.data, (typename, id) => {
              if (typeof id !== 'undefined') {
                entitiesToRemove.add(makeId(typename, id));
              }
            });

            entitiesToRemove.forEach(purge);
          },
        };
      } else {
        const operationId = createHash('md5').update(print(ctx.args.document)).digest('hex');

        if (cachedResponses.has(operationId)) {
          ctx.setResultAndStopExecution(cachedResponses.get(operationId));
          return;
        }

        return {
          onExecuteDone({ result }) {
            cachedResponses.set(operationId, result);
            responseToEnity.set(operationId, new Set());

            collectEntity(result.data, (typename, id) => {
              if (!entityToResponse.has(typename)) {
                entityToResponse.set(typename, new Set());
              }

              // typename => operation
              entityToResponse.get(typename)!.add(operationId);
              // operation => typename
              responseToEnity.get(operationId)!.add(typename);

              if (typeof id !== 'undefined') {
                const eid = makeId(typename, id);

                if (!entityToResponse.has(eid)) {
                  entityToResponse.set(eid, new Set());
                }

                // typename:id => operation
                entityToResponse.get(eid)!.add(operationId);
                // operation => typename:id
                responseToEnity.get(operationId)!.add(eid);
              }
            });
          },
        };
      }
    },
  };
};

function isOperationDefinition(node: any): node is OperationDefinitionNode {
  return node?.kind === 'OperationDefinition';
}

function isMutation(doc: DocumentNode) {
  return doc.definitions.find(isOperationDefinition)!.operation === 'mutation';
}

function makeId(typename: string, id: number | string): string {
  return `${typename}:${id}`;
}

function collectEntity(data: any, add: (typename: string, id?: string) => void) {
  if (!data) {
    return;
  }

  if (typeof data === 'object') {
    for (const field in data) {
      const value = data[field];

      if (field === '__typename') {
        add(value);

        if ('id' in data) {
          add(value, data.id);
        }
      } else {
        collectEntity(value, add);
      }
    }
  } else if (Array.isArray(data)) {
    for (const obj of data) {
      collectEntity(obj, add);
    }
  }
}

const TYPENAME_FIELD: FieldNode = {
  kind: 'Field',
  name: {
    kind: 'Name',
    value: '__typename',
  },
};

function addTypenameToDocument(doc: DocumentNode): DocumentNode {
  return visit(doc, {
    SelectionSet: {
      enter(node, _key, parent) {
        if (parent && isOperationDefinition(parent)) {
          return;
        }

        if (!node.selections) {
          return;
        }

        const skip = node.selections.some(selection => {
          return isField(selection) && (selection.name.value === '__typename' || selection.name.value.lastIndexOf('__', 0) === 0);
        });

        if (skip) {
          return;
        }

        return {
          ...node,
          selections: [...node.selections, TYPENAME_FIELD],
        };
      },
    },
  });
}

function isField(selection: SelectionNode): selection is FieldNode {
  return selection.kind === 'Field';
}
