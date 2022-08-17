import { GetEnvelopedFn, ComposeContext, Plugin, ArbitraryObject } from '@envelop/types';
import { isPluginEnabled, PluginOrDisabledPlugin } from './enable-if.js';
import { createEnvelopOrchestrator, EnvelopOrchestrator, GraphQLEngine } from './orchestrator.js';
import { traceOrchestrator } from './traced-orchestrator.js';

export function envelop<PluginsType extends Plugin<any>[]>(options: {
  plugins: Array<PluginOrDisabledPlugin>;
  enableInternalTracing?: boolean;
  engine?: typeof GraphQLEngine;
}): GetEnvelopedFn<ComposeContext<PluginsType>> {
  const plugins = options.plugins.filter(isPluginEnabled);
  let orchestrator = createEnvelopOrchestrator<ComposeContext<PluginsType>>(plugins, options.engine);

  if (options.enableInternalTracing) {
    orchestrator = traceOrchestrator(orchestrator);
  }

  const getEnveloped = <TInitialContext extends ArbitraryObject>(
    initialContext: TInitialContext = {} as TInitialContext
  ) => {
    const typedOrchestrator = orchestrator as EnvelopOrchestrator<TInitialContext, ComposeContext<PluginsType>>;
    typedOrchestrator.init(initialContext);

    return {
      parse: typedOrchestrator.parse(initialContext),
      validate: typedOrchestrator.validate(initialContext),
      contextFactory: typedOrchestrator.contextFactory(initialContext as any),
      execute: typedOrchestrator.execute,
      subscribe: typedOrchestrator.subscribe,
      schema: typedOrchestrator.getCurrentSchema(),
    };
  };

  getEnveloped._plugins = plugins;

  return getEnveloped as GetEnvelopedFn<ComposeContext<PluginsType>>;
}
