import { Maybe, Plugin, isAsyncIterable } from '@envelop/types';
import { createHash } from 'crypto';
import {
  DocumentNode,
  OperationDefinitionNode,
  FieldNode,
  SelectionNode,
  visit,
  parse,
  print,
  TypeInfo,
  visitWithTypeInfo,
} from 'graphql';
import type { Cache, CacheInvalidationRecord } from './cache';
import { createInMemoryCache } from './in-memory-cache';
export { createInMemoryCache } from './in-memory-cache';

interface Options<C = any> {
  cache?: Cache;
  /**
   * Maximum age in ms. Defaults to `Infinity`.
   */
  ttl?: number;
  /**
   * Overwrite the ttl for query operations whose execution result contains a specific object type.
   * Useful if the occurrence of a object time in the execution result should reduce the ttl of the query operation.
   */
  ttlPerType?: Record<string, number>;
  /**
   * Overwrite the ttl for query operations whose selection contains a specific schema coordinate (e.g. Query.users).
   * Useful if the selection of a specific field should reduce the TTL of the query operation.
   */
  ttlPerSchemaCoordinate?: Record<string, number>;
  /**
   * Allows to cache responses based on the resolved session id.
   * Return a unique value for each session.
   * Return `null` or `undefined` to mark the session as public/global.
   * Creates a global session by default.
   * @param context GraphQL Context
   */
  session?(context: C): string | undefined | null;
  /**
   * Skip caching of following the types.
   */
  ignoredTypes?: string[];
}

export function useResponseCache({
  cache = createInMemoryCache(),
  ttl = Infinity,
  session = () => null,
  ignoredTypes = [],
  ttlPerType = {},
  ttlPerSchemaCoordinate,
}: Options = {}): Plugin {
  const ignoredTypesMap = new Set<string>(ignoredTypes);

  return {
    onParse(ctx) {
      ctx.setParseFn((source, options) => addTypenameToDocument(parse(source, options)));
    },
    async onExecute(ctx) {
      if (isMutation(ctx.args.document)) {
        return {
          onExecuteDone({ result }) {
            if (isAsyncIterable(result)) {
              // eslint-disable-next-line no-console
              console.warn('[useResponseCache] AsyncIterable returned from execute is currently unsupported.');
              return;
            }

            const entitiesToRemove = new Set<CacheInvalidationRecord>();

            collectEntity(result.data, (typename, id) => {
              if (id != null) {
                entitiesToRemove.add({ typename, id });
              }
            });

            cache.invalidate(entitiesToRemove);
          },
        };
      } else {
        const operationId = createHash('sha1')
          .update(
            [print(ctx.args.document), JSON.stringify(ctx.args.variableValues || {}), session(ctx.args.contextValue) ?? ''].join(
              '|'
            )
          )
          .digest('base64');

        const cachedResponse = await cache.get(operationId);

        if (cachedResponse != null) {
          ctx.setResultAndStopExecution(cachedResponse);
          return;
        }

        let ttlForOperation = ttl;

        if (ttlPerSchemaCoordinate) {
          const typeInfo = new TypeInfo(ctx.args.schema);
          visit(
            ctx.args.document,
            visitWithTypeInfo(typeInfo, {
              Field(fieldNode) {
                const parentType = typeInfo.getParentType();
                if (parentType) {
                  const schemaCoordinate = `${parentType.name}.${fieldNode.name.value}`;
                  if (schemaCoordinate in ttlPerSchemaCoordinate) {
                    ttlForOperation = Math.min(ttlForOperation, ttlPerSchemaCoordinate[schemaCoordinate]);
                  }
                }
              },
            })
          );
        }

        return {
          onExecuteDone({ result }) {
            if (isAsyncIterable(result)) {
              // eslint-disable-next-line no-console
              console.warn('[useResponseCache] AsyncIterable returned from execute is currently unsupported.');
              return;
            }

            let skip = false;
            const collectedEntities: [string, Maybe<string>][] = [];

            collectEntity(result.data, (typename, id) => {
              skip = skip || ignoredTypesMap.has(typename);

              if (typename in ttlPerType) {
                ttlForOperation = Math.min(ttlForOperation, ttlPerType[typename]);
              }

              if (!skip) {
                collectedEntities.push([typename, id]);
              }
            });

            if (skip) {
              return;
            }

            cache.set(operationId, result, collectedEntities, ttlForOperation);
          },
        };
      }
    },
  };
}

function isOperationDefinition(node: any): node is OperationDefinitionNode {
  return node?.kind === 'OperationDefinition';
}

function isMutation(doc: DocumentNode) {
  return doc.definitions.find(isOperationDefinition)!.operation === 'mutation';
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
