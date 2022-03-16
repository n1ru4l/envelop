import { Plugin } from '@envelop/core';
import { Application, OperationController } from 'graphql-modules';
import { InternalAppContext } from 'graphql-modules/application/application';

const graphqlModulesControllerSymbol = Symbol('GRAPHQL_MODULES');

type PluginContext = InternalAppContext & {
  [graphqlModulesControllerSymbol]: OperationController;
};

export const useGraphQLModules = (app: Application): Plugin<{}, PluginContext> => {
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
  };
};
