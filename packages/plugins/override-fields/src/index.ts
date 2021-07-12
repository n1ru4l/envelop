import { Plugin, DefaultContext, OnResolverCalledHook, ResolverFn } from '@envelop/types';
import { Path } from 'graphql/jsutils/Path';

type PlainFieldsSet = Set<string>;
type PatternFieldsSet = Set<RegExp>;

export type UseOverrideFieldsOptions<Context = DefaultContext> = {
  fields: Array<string | RegExp>;
  shouldOverride?: (context: Readonly<Context>) => boolean;
  overrideFn?: ResolverFn;
};

const DEFAULT_OPTIONS: Omit<UseOverrideFieldsOptions, 'fields'> = {
  shouldOverride: () => true,
  overrideFn: () => null,
};

export const useOverrideFields = (rawOptions: UseOverrideFieldsOptions): Plugin => {
  const options: UseOverrideFieldsOptions = {
    ...DEFAULT_OPTIONS,
    ...(rawOptions || {}),
  };
  const plainFieldRules: PlainFieldsSet = new Set();
  const patternFieldRules: PatternFieldsSet = new Set();

  for (const field of options.fields) {
    const fieldRulesSet = field instanceof RegExp ? patternFieldRules : plainFieldRules;
    fieldRulesSet.add(field as string & RegExp);
  }

  return {
    onExecute({ args: { contextValue } }) {
      const shouldOverride = options.shouldOverride!(contextValue);

      const onResolverCalled: OnResolverCalledHook | undefined = shouldOverride
        ? ({ replaceResolverFn, info }) => {
            const flattenedPath = flattenPath(info.path);

            if (plainFieldRules.has(flattenedPath)) {
              return replaceResolverFn(options.overrideFn!);
            }

            for (const patternRule of patternFieldRules) {
              if (patternRule.test(flattenedPath)) {
                return replaceResolverFn(options.overrideFn!);
              }
            }

            return undefined;
          }
        : undefined;

      return {
        onResolverCalled,
      };
    },
  };
};

function flattenPath(fieldPath: Path, delimiter = '.') {
  const pathArray = [];
  let thisPath: Path | undefined = fieldPath;

  while (thisPath) {
    if (typeof thisPath.key !== 'number') {
      pathArray.push(thisPath.key);
    }
    thisPath = thisPath.prev;
  }

  return pathArray.reverse().join(delimiter);
}
