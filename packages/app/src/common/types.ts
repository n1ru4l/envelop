import type { ModuleConfig } from 'graphql-modules';
import type { IncomingHttpHeaders } from 'http';
import type { ExecutionContext as HelixExecutionContext } from 'graphql-helix';

export type PromiseOrValue<T> = T | Promise<T>;

export type DeepPartial<T> = T extends Function
  ? T
  : T extends Array<infer U>
  ? // eslint-disable-next-line no-use-before-define
    DeepPartialArray<U>
  : T extends object
  ? // eslint-disable-next-line no-use-before-define
    DeepPartialObject<T>
  : T | undefined;

interface DeepPartialArray<T> extends Array<PromiseOrValue<DeepPartial<PromiseOrValue<T>>>> {}
type DeepPartialObject<T> = {
  [P in keyof T]?: PromiseOrValue<DeepPartial<PromiseOrValue<T[P]>>>;
};

export interface ExecutionContext extends HelixExecutionContext {
  request: {
    body?: any;
    headers: IncomingHttpHeaders;
    method: string;
    query: any;
  };
}

export interface EnvelopContext extends ExecutionContext {}

export interface EnvelopResolvers extends Record<string, any> {}

export type EnvelopModuleConfig = Omit<ModuleConfig, 'typeDefs' | 'id' | 'resolvers'> & {
  id?: string;
  resolvers?: EnvelopResolvers;
  /**
   * Automatically add the created module in the built envelop app
   *
   * @default true
   */
  autoAdd?: boolean;
};

export type PromiseType<T> = T extends PromiseLike<infer U> ? U : T;

export type InferFunctionReturn<TFunction extends (...args: any) => any> = PromiseType<ReturnType<TFunction>>;

export type { AltairOptions, GraphiQLOptions, IDEOptions } from './ide/handle';

export type { ScalarsConfig } from './scalars';

export type { CodegenConfig, CodegenDocumentsConfig } from './codegen/typescript';

export type { InferDataLoader } from './dataloader';
