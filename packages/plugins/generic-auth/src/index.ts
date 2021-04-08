import { Plugin } from '@envelop/types';

export class UnauthenticatedError extends Error {}

export type GenericAuthPluginOptions = {};

export const useGenericAuth = (options: GenericAuthPluginOptions): Plugin => {
  return {};
};
