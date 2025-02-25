import {
  composeInstruments,
  getInstrumented,
  getInstrumentsAndPlugins,
} from '@envelop/instruments';
import {
  ArbitraryObject,
  ComposeContext,
  GetEnvelopedFn,
  Instruments,
  Optional,
  Plugin,
} from '@envelop/types';
import { createEnvelopOrchestrator, EnvelopOrchestrator } from './orchestrator.js';

type ExcludeFalsy<TArray extends any[]> = Exclude<TArray[0], null | undefined | false>[];

function notEmpty<T>(value: Optional<T>): value is T {
  return value != null;
}

export function envelop<PluginsType extends Optional<Plugin<any>>[]>(options: {
  plugins: PluginsType;
  enableInternalTracing?: boolean;
}): GetEnvelopedFn<ComposeContext<ExcludeFalsy<PluginsType>>> {
  const { pluginInstruments, plugins } = getInstrumentsAndPlugins<Instruments<any>, Plugin<any>>(
    options.plugins.filter(notEmpty),
  );
  const instruments = composeInstruments(pluginInstruments);
  const orchestrator = createEnvelopOrchestrator<ComposeContext<ExcludeFalsy<PluginsType>>>({
    plugins,
  });

  const getEnveloped = <TInitialContext extends ArbitraryObject>(
    context: TInitialContext = {} as TInitialContext,
  ) => {
    const instrumented = getInstrumented<{ context: any }>({ context });
    const typedOrchestrator = orchestrator as EnvelopOrchestrator<
      TInitialContext,
      ComposeContext<ExcludeFalsy<PluginsType>>
    >;

    instrumented.fn(instruments?.init, orchestrator.init)(context);

    return {
      parse: instrumented.fn(instruments?.parse, typedOrchestrator.parse(context)),
      validate: instrumented.fn(instruments?.validate, typedOrchestrator.validate(context)),
      contextFactory: instrumented.fn(
        instruments?.context,
        typedOrchestrator.contextFactory(context as any),
      ),
      execute: instrumented.asyncFn(instruments?.execute, typedOrchestrator.execute),
      subscribe: instrumented.asyncFn(instruments?.subscribe, typedOrchestrator.subscribe),
      schema: typedOrchestrator.getCurrentSchema(),
    };
  };

  getEnveloped._plugins = plugins;

  return getEnveloped as GetEnvelopedFn<ComposeContext<ExcludeFalsy<PluginsType>>>;
}
