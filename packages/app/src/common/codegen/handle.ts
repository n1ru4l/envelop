import type { Envelop } from '@envelop/types';
import type { CodegenConfig } from './typescript';

export interface WithCodegen {
  /**
   * Enable code generation, by default is enabled if `NODE_ENV` is not `production` nor `test`
   *
   * @default process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test"
   */
  enableCodegen?: boolean;

  /**
   * Add custom codegen config
   */
  codegen?: CodegenConfig;

  /**
   * Output schema target path or flag
   *
   * If `true`, defaults to `"./schema.gql"`
   * You have to specify a `.gql`, `.graphql` or `.json` extension
   *
   * @default false
   */
  outputSchema?: boolean | string;
}

export interface InternalCodegenConfig {
  moduleName: 'express' | 'fastify' | 'nextjs' | 'http' | 'koa' | 'hapi' | 'extend';
}

export function handleCodegen(getEnveloped: Envelop<unknown>, config: WithCodegen, internalConfig: InternalCodegenConfig): void {
  const {
    codegen: {
      // eslint-disable-next-line no-console
      onError = console.error,
      onFinish,
    } = {},
    outputSchema,
    enableCodegen = process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test',
  } = config;

  if (!enableCodegen) return onFinish?.();

  const { schema } = getEnveloped();

  Promise.all([
    outputSchema
      ? import('./outputSchema').then(({ writeOutputSchema }) => {
          return writeOutputSchema(schema, outputSchema).catch(onError);
        })
      : null,

    import('./typescript').then(({ EnvelopTypeScriptCodegen }) => {
      return EnvelopTypeScriptCodegen(schema, config, internalConfig).catch(onError);
    }),
  ]).then(onFinish, onError);
}
