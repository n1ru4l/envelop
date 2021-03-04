import { Plugin } from '@envelop/types';
import depthLimit from 'graphql-depth-limit';

export type DepthLimitConfig = { maxDepth: number; ignore?: string[] };

export const useDepthLimit = (config: DepthLimitConfig): Plugin => {
  const ignore = config.ignore || [];
  const checkFn = depthLimit(config.maxDepth, { ignore });

  return {
    onValidate({ addValidationRule }) {
      addValidationRule(checkFn);
    },
  };
};
