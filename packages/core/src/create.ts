import { GetEnvelopedFn, ComposeContext, Plugin, ArbitraryObject } from '@envelop/types';
import { createEnvelopOrchestrator, EnvelopOrchestrator } from './orchestrator';
import { traceOrchestrator } from './traced-orchestrator';

export function envelop<PluginsType extends Plugin<any>[]>(options: {
  plugins: PluginsType;
  enableInternalTracing?: boolean;
}): GetEnvelopedFn<ComposeContext<PluginsType>> {
  let orchestrator = createEnvelopOrchestrator<ComposeContext<PluginsType>>(options.plugins as any);

  if (options.enableInternalTracing) {
    orchestrator = traceOrchestrator(orchestrator);
  }

  const getEnveloped = <TInitialContext extends ArbitraryObject>(initialContext: null | TInitialContext) => {
    const initialCtx = initialContext || ({} as TInitialContext);

    // If `initialContext` is null, we want to skip `onEnveloped` phase, so `init` function isn't called.
    // This is done when there is a need for separating the static call (to get execute/subscribe) and the dynamic call (with the improved `context`).
    if (initialContext !== null) {
      orchestrator.init(initialCtx);
    }

    const typedOrchestrator = orchestrator as EnvelopOrchestrator<TInitialContext, ComposeContext<PluginsType>>;

    return {
      parse: typedOrchestrator.parse(initialCtx),
      validate: typedOrchestrator.validate(initialCtx),
      contextFactory: typedOrchestrator.contextFactory(initialCtx),
      execute: typedOrchestrator.execute,
      subscribe: typedOrchestrator.subscribe,
      schema: typedOrchestrator.schema!,
    };
  };

  getEnveloped._plugins = options.plugins;

  return getEnveloped as GetEnvelopedFn<ComposeContext<PluginsType>>;
}
