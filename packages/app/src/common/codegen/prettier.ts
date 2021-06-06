import type { BuiltInParserName } from 'prettier';

export async function formatPrettier(str: string, parser: BuiltInParserName): Promise<string> {
  const prettier = await import('prettier');

  const { resolveConfig = prettier.default.resolveConfig, format = prettier.default.format } = prettier;

  const prettierConfig = Object.assign({}, await resolveConfig(process.cwd()));

  return format(str, {
    parser,
    ...prettierConfig,
  });
}
