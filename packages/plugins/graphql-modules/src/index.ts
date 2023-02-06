import { Plugin } from '@envelop/core';
import { Application } from 'graphql-modules';

const graphqlModulesControllerSymbol = Symbol('GRAPHQL_MODULES');

export const useGraphQLModules = (app: Application): Plugin => {
  return {
    onPluginInit({ setSchema }) {
      setSchema(app.schema);
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
    onSubscribe({ args }) {
      return {
        onSubscribeResult: () => {
          if (args.contextValue && args.contextValue[graphqlModulesControllerSymbol]) {
            args.contextValue[graphqlModulesControllerSymbol].destroy();
            args.contextValue[graphqlModulesControllerSymbol] = null;
          }
        },
      };
    },
  };
};
