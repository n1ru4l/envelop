import { GetEnvelopedFn, ComposeContext, Plugin, ArbitraryObject, Unarray, NullableArray } from '@envelop/types';
import { createEnvelopOrchestrator, EnvelopOrchestrator } from './orchestrator';
import { traceOrchestrator } from './traced-orchestrator';

export function envelop<PluginsType extends Plugin<any>[]>(options: {
  plugins: NullableArray<PluginsType>;
  enableInternalTracing?: boolean;
}): GetEnvelopedFn<ComposeContext<PluginsType>> {
  const plugins = options.plugins.filter(Boolean) as PluginsType;

  let orchestrator = createEnvelopOrchestrator<ComposeContext<PluginsType>>(plugins);

  if (options.enableInternalTracing) {
    orchestrator = traceOrchestrator(orchestrator);
  }

  const getEnveloped = <TInitialContext extends ArbitraryObject>(initialContext: TInitialContext = {} as TInitialContext) => {
    const typedOrchestrator = orchestrator as EnvelopOrchestrator<TInitialContext, ComposeContext<PluginsType>>;
    typedOrchestrator.init(initialContext);

    return {
      parse: typedOrchestrator.parse(initialContext),
      validate: typedOrchestrator.validate(initialContext),
      contextFactory: typedOrchestrator.contextFactory(initialContext),
      execute: typedOrchestrator.execute,
      subscribe: typedOrchestrator.subscribe,
      schema: typedOrchestrator.getCurrentSchema(),
    };
  };

  getEnveloped._plugins = plugins;

  return getEnveloped as GetEnvelopedFn<ComposeContext<PluginsType>>;
}
