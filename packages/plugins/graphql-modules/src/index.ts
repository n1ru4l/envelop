import { PluginFn } from '@guildql/types';
import { Application } from 'graphql-modules';

export const useGraphQLModules = (app: Application): PluginFn => api => {
  api.on('onInit', support => {
    support.replaceSchema(app.schema);
  });

  api.on('beforeExecute', support => {
    const params = support.getExecutionParams();

    const controller = app.createOperationController({
      context: params.contextValue,
      autoDestroy: false,
    });

    support.setContext({
      ...(params.contextValue || {}),
      ...controller.context,
      __modulesController: controller,
    });
  });

  api.on('afterExecute', support => {
    const params = support.getExecutionParams();
    const context = params.contextValue;

    if (context && context.__modulesController) {
      context.__modulesController.destroy();
      context.__modulesController = null;
    }
  });
};
