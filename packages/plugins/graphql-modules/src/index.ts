import { Plugin } from '@envelop/core';
import { Application } from 'graphql-modules';
import { compatSchema } from '@graphql-tools/compat';

const graphqlModulesControllerSymbol = Symbol('GRAPHQL_MODULES');

export const useGraphQLModules = (app: Application): Plugin => {
  return {
    onPluginInit({ setSchema }) {
      setSchema(compatSchema.toTools(app.schema));
    },
    onContextBuilding({ extendContext, context }) {
      const controller = app.createOperationController({
        context,
        autoDestroy: false,
      });

      extendContext({
        ...controller.context,
        [graphqlModulesControllerSymbol]: controller,
      });
    },
    onExecute({ args }) {
      return {
        onExecuteDone: () => {
          if (args.contextValue && args.contextValue[graphqlModulesControllerSymbol]) {
            args.contextValue[graphqlModulesControllerSymbol].destroy();
            args.contextValue[graphqlModulesControllerSymbol] = null;
          }
        },
      };
    },
  };
};
