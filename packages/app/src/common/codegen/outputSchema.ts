import { executeSync, getIntrospectionQuery, GraphQLSchema, parse } from 'graphql';
import { resolve } from 'path';

import { printSchemaWithDirectives } from '@graphql-tools/utils';

import { formatPrettier } from './prettier';
import { writeFileIfChanged } from './write';

export async function writeOutputSchema(schema: GraphQLSchema, outputPath: string | boolean): Promise<void> {
  if (!outputPath) return;

  let targetPath: string;
  if (typeof outputPath === 'boolean') {
    targetPath = resolve('./schema.gql');
  } else {
    if (!(outputPath.endsWith('.gql') || outputPath.endsWith('.graphql') || outputPath.endsWith('.json'))) {
      throw Error(
        `You have to specify a extension between '.gql', '.graphql' and '.json' for the outputSchema, received: "${outputPath}"`
      );
    }

    targetPath = resolve(outputPath);
  }

  let schemaString: string;

  if (targetPath.endsWith('.json')) {
    const result = executeSync({
      schema,
      document: parse(getIntrospectionQuery()),
    });
    schemaString = await formatPrettier(JSON.stringify(result.data, null, 2), 'json-stringify');
  } else {
    schemaString = await formatPrettier(printSchemaWithDirectives(schema), 'graphql');
  }
  await writeFileIfChanged(targetPath, schemaString);
}
