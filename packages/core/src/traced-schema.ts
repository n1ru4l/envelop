import { AfterResolverHook, OnResolverCalledHook, ResolverFn } from '@envelop/types';
export const resolversHooksSymbol = Symbol('RESOLVERS_HOOKS');
const trackedSchemaSymbol = Symbol('TRACKED_SCHEMA');

const introspectionTypes = [
  '__Schema',
  '__Directive',
  '__DirectiveLocation',
  '__Type',
  '__Field',
  '__InputValue',
  '__EnumValue',
  '__TypeKind',
];

function isObjectLike(value: unknown) {
  return typeof value === 'object' && value !== null;
}
/**
 * If a resolve function is not given, then a default resolve behavior is used
 * which takes the property of the source object of the same name as the field
 * and returns it as the result, or if it's a function, returns the result
 * of calling that function while passing along args and context value.
 */
const defaultFieldResolver = function (source: unknown, args: unknown, contextValue: unknown, info: unknown) {
  // ensure source is a value for which property access is acceptable.
  if (isObjectLike(source) || typeof source === 'function') {
    const property = source[info.fieldName];
    console.log('property', property);
    if (typeof property === 'function') {
      return source[info.fieldName](args, contextValue, info);
    }

    return property;
  }
};

const isIntrospectionType = (type: any) => {
  return introspectionTypes.some(name => type.name === name);
};

/**
 * Based on the `.toConfig()` method of the `GraphQLObjectType` class.
 * https://github.com/graphql/graphql-js/blob/29bf39faa670effd3c1561a1512ec7767658a63b/src/type/definition.ts#L744-L755
 *
 * This isn't the best but will get the job done
 */
const isObjectType = (type: any) => {
  if ('fields' in type && 'isTypeOf' in type) {
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
        let resolverFn: ResolverFn = field.resolve || defaultFieldResolver;
        // We are not going to wrap any default resolvers
        if (!resolverFn) return;

        // @ts-expect-error - we know this is a resolver fn
        field.resolve = async (root, args, context, info) => {
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
