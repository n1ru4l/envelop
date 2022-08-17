import { GetEnvelopedFn, ComposeContext, Plugin, ArbitraryObject } from '@envelop/types';
import { isPluginEnabled, PluginOrDisabledPlugin } from './enable-if.js';
import { createEnvelopOrchestrator, EnvelopOrchestrator, GraphQLEngine, Engine } from './orchestrator.js';
import { traceOrchestrator } from './traced-orchestrator.js';
import { parse, validate, subscribe, execute } from 'graphql';

const defaultEngine = GraphQLEngine({ parse, validate, subscribe, execute });

export function envelop<PluginsType extends Plugin<any>[]>(options: {
  plugins: Array<PluginOrDisabledPlugin>;
  enableInternalTracing?: boolean;
  engine?: Engine;
}): GetEnvelopedFn<ComposeContext<PluginsType>> {
  const plugins = options.plugins.filter(isPluginEnabled);
  let orchestrator = createEnvelopOrchestrator<ComposeContext<PluginsType>>(plugins, options?.engine ?? defaultEngine);

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
