import { Plugin } from '@envelop/core';
import AWSXRay from 'aws-xray-sdk-core';
import { GraphQLResolveInfo } from 'graphql';

export interface UseXRayOptions<Context> {
  resolvers: boolean | ((options: { info: GraphQLResolveInfo; context: Context }) => boolean);
}

const DEFAULT_OPTIONS: UseXRayOptions<unknown> = {
  resolvers: true,
};

export enum AttributeName {
  RESOLVER_FIELD_NAME = 'graphql.resolver.fieldName',
  RESOLVER_TYPE_NAME = 'graphql.resolver.typeName',
  RESOLVER_RESULT_TYPE = 'graphql.resolver.resultType',
}

const tracingSegmentSymbol = Symbol('OPEN_TELEMETRY_GRAPHQL');

export const useXRay = <Context>(rawOptions?: Partial<UseXRayOptions<Context>>): Plugin => {
  const options: UseXRayOptions<Context> = {
    ...DEFAULT_OPTIONS,
    ...(rawOptions || {}),
  };

  return {
    onExecute({ args, extendContext }) {
      const parentSegment = AWSXRay.getSegment();

      if (!parentSegment) {
        return;
      }

      const segment = new AWSXRay.Subsegment(`${args.operationName || 'Anonymous Operation'}`);

      parentSegment.addSubsegment(segment);

      if (options.resolvers) {
        extendContext({
          [tracingSegmentSymbol]: segment,
        });
      }

      return {
        onExecuteDone() {
          segment.close();
        },
      };
    },
    onResolverCalled: options.resolvers
      ? ({ info, context, args, replaceResolverFn }) => {
          const activeSegment = AWSXRay.getSegment();
          if (tracingSegmentSymbol in context && context[tracingSegmentSymbol] && !activeSegment) {
            AWSXRay.setSegment(context[tracingSegmentSymbol]);
          } else if (!activeSegment) {
            return;
          }

          if (typeof options.resolvers === 'function' && !options.resolvers({ info, context: context as Context })) {
            return;
          }

          replaceResolverFn(resolve => {
            return (...args: unknown[]) => {
              if (tracingSegmentSymbol in context && context[tracingSegmentSymbol] && !AWSXRay.getSegment()) {
                AWSXRay.setSegment(context[tracingSegmentSymbol]);
              }

              return AWSXRay.captureAsyncFunc(`GraphQL ${info.parentType.name}.${info.fieldName}`, subsegment => {
                subsegment?.addAttribute(AttributeName.RESOLVER_FIELD_NAME, info.fieldName);
                subsegment?.addAttribute(AttributeName.RESOLVER_TYPE_NAME, info.parentType.name);
                subsegment?.addAttribute(AttributeName.RESOLVER_RESULT_TYPE, info.returnType.toString());

                try {
                  const result = resolve(...args);
                  subsegment?.close();

                  if (isThenable(result)) {
                    return result.then(
                      val => {
                        subsegment?.close();

                        return val;
                      },
                      error => {
                        subsegment?.close(error as Error);

                        throw error;
                      }
                    );
                  }

                  return result;
                } catch (error: any | Error) {
                  subsegment?.close(error as Error);
                  throw error;
                }
              });
            };
          });
        }
      : undefined,
  };
};

export function isThenable(value: unknown): value is Promise<unknown> {
  return !!(
    value &&
    (typeof value === 'object' || typeof value === 'function') &&
    typeof (value as Record<string, unknown>).then === 'function'
  );
}
