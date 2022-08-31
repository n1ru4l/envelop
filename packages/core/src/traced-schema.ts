import { AfterResolverHook, OnResolverCalledHook, ResolverFn } from '@envelop/types';
export const resolversHooksSymbol = Symbol('RESOLVERS_HOOKS');
const trackedSchemaSymbol = Symbol('TRACKED_SCHEMA');

function isObjectLike(value: unknown) {
  return typeof value === 'object' && value !== null;
}

const isIntrospectionType = (type: any) => {
  return type.name.startsWith('__');
};

/**
 * This isn't the best but will get the job done
 */
const isObjectType = (type: any) => {
  if (isObjectLike(type) && '_interfaces' in type) {
    return true;
  }
  return false;
};

// Note: in future we might have to drop this if there is some implementation which wildly differs
export function prepareTracedSchema(schema: any | null | undefined): void {
  if (!schema || schema[trackedSchemaSymbol]) {
    return;
  }

  schema[trackedSchemaSymbol] = true;
  const entries = Object.values(schema.getTypeMap());

  for (const type of entries) {
    if (!isIntrospectionType(type) && isObjectType(type)) {
      // @ts-expect-error - we know this is an object type
      const fields = Object.values(type.getFields());

      for (const field of fields) {
        // @ts-expect-error - we hope there is a resolve field
        const existingResolver = field.resolve;
        // We are not going to wrap any default resolvers
        if (!existingResolver) continue;

        // @ts-expect-error - we know this is a resolver fn
        field.resolve = async (root, args, context, info) => {
          let resolverFn: ResolverFn = existingResolver;
          if (context && context[resolversHooksSymbol]) {
            const hooks: OnResolverCalledHook[] = context[resolversHooksSymbol];
            const afterCalls: AfterResolverHook[] = [];

            for (const hook of hooks) {
              const afterFn = await hook({
                root,
                args,
                context,
                info,
                resolverFn,
                replaceResolverFn: newFn => {
                  resolverFn = newFn as ResolverFn;
                },
              });
              afterFn && afterCalls.push(afterFn);
            }

            try {
              let result = await resolverFn(root, args, context, info);

              for (const afterFn of afterCalls) {
                afterFn({
                  result,
                  setResult: newResult => {
                    result = newResult;
                  },
                });
              }

              return result;
            } catch (e) {
              let resultErr = e;

              for (const afterFn of afterCalls) {
                afterFn({
                  result: resultErr,
                  setResult: newResult => {
                    resultErr = newResult;
                  },
                });
              }

              throw resultErr;
            }
          } else {
            return resolverFn(root, args, context, info);
          }
        };
      }
    }
  }
}
