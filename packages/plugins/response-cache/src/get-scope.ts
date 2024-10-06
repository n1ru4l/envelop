import {
  FieldNode,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLOutputType,
  GraphQLSchema,
  Kind,
  parse,
  SelectionNode,
  visit,
} from 'graphql';
import { memoize1 } from '@graphql-tools/utils';
import { CacheControlDirective, isPrivate } from './plugin';

/** Parse the selected query fields */
function parseSelections(
  selections: ReadonlyArray<SelectionNode> = [],
  record: Record<string, any>,
) {
  for (const selection of selections) {
    if (selection.kind === Kind.FIELD) {
      record[selection.name.value] = {};
      parseSelections(selection.selectionSet?.selections, record[selection.name.value]);
    }
  }
}

/** Iterate over record and parse its fields with schema type */
function parseRecordWithSchemaType(
  type: GraphQLOutputType,
  record: Record<string, any>,
  prefix?: string,
): Set<string> {
  let fields: Set<string> = new Set();
  if (type instanceof GraphQLNonNull || type instanceof GraphQLList) {
    fields = new Set([...fields, ...parseRecordWithSchemaType(type.ofType, record, prefix)]);
  }

  if (type instanceof GraphQLObjectType) {
    const newPrefixes = [...(prefix ?? []), type.name];
    fields.add(newPrefixes.join('.'));

    const typeFields = type.getFields();
    for (const key of Object.keys(record)) {
      const field = typeFields[key];
      if (!field) {
        continue;
      }

      fields.add([...newPrefixes, field.name].join('.'));
      if (Object.keys(record[key]).length > 0) {
        fields = new Set([...fields, ...parseRecordWithSchemaType(field.type, record[key])]);
      }
    }
  }

  return fields;
}

function getSchemaCoordinatesFromQuery(schema: GraphQLSchema, query: string): Set<string> {
  const ast = parse(query);
  let fields: Set<string> = new Set();

  // Launch the field visitor
  visit(ast, {
    // Parse the fields of the root of query
    Field: node => {
      const record: Record<string, any> = {};
      const queryFields = schema.getQueryType()?.getFields()[node.name.value];

      if (queryFields) {
        record[node.name.value] = {};
        parseSelections(node.selectionSet?.selections, record[node.name.value]);

        fields.add(`Query.${node.name.value}`);
        fields = new Set([
          ...fields,
          ...parseRecordWithSchemaType(queryFields.type, record[node.name.value]),
        ]);
      }
    },
    // And each fragment
    FragmentDefinition: fragment => {
      const type = fragment.typeCondition.name.value;
      fields = new Set([
        ...fields,
        ...(
          fragment.selectionSet.selections.filter(({ kind }) => kind === Kind.FIELD) as FieldNode[]
        ).map(({ name: { value } }) => `${type}.${value}`),
      ]);
    },
  });

  return fields;
}

export const getScopeFromQuery = (
  schema: GraphQLSchema,
  query: string,
): NonNullable<CacheControlDirective['scope']> => {
  const fn = memoize1(({ query }: { query: string }) => {
    const schemaCoordinates = getSchemaCoordinatesFromQuery(schema, query);

    for (const coordinate of schemaCoordinates) {
      if (isPrivate(coordinate)) {
        return 'PRIVATE';
      }
    }
    return 'PUBLIC';
  });
  return fn({ query });
};
