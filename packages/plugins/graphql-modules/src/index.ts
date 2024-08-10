import type { Application, OperationController } from 'graphql-modules';
import type { Plugin } from '@envelop/core';

export const useGraphQLModules = (app: Application): Plugin => {
  const controllerMap = new WeakMap<any, OperationController>();
  return {
    onPluginInit({ setSchema }) {
      setSchema(app.schema);
    },
    onContextBuilding({ context, extendContext }) {
      const controller = app.createOperationController({
        context,
        autoDestroy: false,
      });

      extendContext(controller.context);

      controllerMap.set(context, controller);
    },
    onExecute({ args }) {
      return {
        onExecuteDone() {
          const controller = controllerMap.get(args.contextValue);
          controller?.destroy();
        },
      };
    },
    onSubscribe({ args }) {
      return {
        onSubscribeResult({ args }) {
          return {
            onEnd() {
              const controller = controllerMap.get(args.contextValue);
              controller?.destroy();
            },
          };
        },
        onSubscribeError() {
          const controller = controllerMap.get(args.contextValue);
          controller?.destroy();
        },
      };
    },
  };
};
