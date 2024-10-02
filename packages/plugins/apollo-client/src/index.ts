import { ApolloLink, FetchResult, Observable, Operation } from '@apollo/client';
import { ComposeContext, GetEnvelopedFn, Optional, Plugin } from '@envelop/types';

type ExcludeFalsy<TArray extends any[]> = Exclude<TArray[0], null | undefined | false>[];

export namespace EnvelopSchemaLink {
  export type ResolverContext = Record<string, any>;
  export type ResolverContextFunction = (
    operation: Operation,
  ) => ResolverContext | PromiseLike<ResolverContext>;
  export type Options<PluginsType extends Optional<Plugin<any>>[]> = ReturnType<
    GetEnvelopedFn<ComposeContext<ExcludeFalsy<PluginsType>>>
  >;
}

/**
 * Lets you use Envelop with Apollo Client. Useful for server-side rendering.
 * Inspired by SchemaLink https://github.com/apollographql/apollo-client/blob/main/src/link/schema/index.ts#L8
 */
export class EnvelopSchemaLink<PluginsType extends Optional<Plugin<any>>[]> extends ApolloLink {
  private envelope: EnvelopSchemaLink.Options<PluginsType>;

  constructor(options: EnvelopSchemaLink.Options<PluginsType>) {
    super();
    this.envelope = options;
  }

  public request(operation: Operation): Observable<FetchResult> {
    return new Observable<FetchResult>(observer => {
      new Promise<EnvelopSchemaLink.ResolverContext>(resolve =>
        resolve(this.envelope.contextFactory),
      )
        .then(context => {
          const validationErrors = this.envelope.validate(this.envelope.schema, operation.query);

          if (validationErrors.length > 0) {
            return { errors: validationErrors };
          }

          return this.envelope.execute({
            schema: this.envelope.schema,
            document: operation.query,
            rootValue: {
              execute: this.envelope.execute,
              subscribe: this.envelope.subscribe,
            },
            contextValue: context,
            variableValues: operation.variables,
            operationName: operation.operationName,
          });
        })
        .then(data => {
          if (!observer.closed) {
            observer.next(data);
            observer.complete();
          }
        })
        .catch(error => {
          if (!observer.closed) {
            observer.error(error);
          }
        });
    });
  }
}
