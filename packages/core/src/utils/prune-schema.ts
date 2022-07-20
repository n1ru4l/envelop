import {
  GraphQLSchema,
  getNamedType,
  isObjectType,
  isInterfaceType,
  isUnionType,
  isInputObjectType,
  GraphQLFieldMap,
  isSpecifiedScalarType,
  isScalarType,
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLNamedType,
  GraphQLScalarType,
  visit,
} from '@envelop/graphql';

import { mapSchema } from './map-schema.js';
import { MapperKind } from './interfaces.js';
import { getRootTypes } from './root-types.js';
import { getImplementingTypes } from './get-implementing-types.js';

export interface SchemaPrintOptions {
  /**
   * Descriptions are defined as preceding string literals, however an older
   * experimental version of the SDL supported preceding comments as
   * descriptions. Set to true to enable this deprecated behavior.
   * This option is provided to ease adoption and will be removed in v16.
   *
   * Default: false
   */
  commentDescriptions?: boolean;
  assumeValid?: boolean;
}

export interface GetDocumentNodeFromSchemaOptions {
  pathToDirectivesInExtensions?: Array<string>;
}

export type PrintSchemaWithDirectivesOptions = SchemaPrintOptions & GetDocumentNodeFromSchemaOptions;

export type Maybe<T> = null | undefined | T;

export type Constructor<T> = new (...args: any[]) => T;

export type PruneSchemaFilter = (type: GraphQLNamedType) => boolean;

/**
 * Options for removing unused types from the schema
 */
export interface PruneSchemaOptions {
  /**
   * Return true to skip pruning this type. This check will run first before any other options.
   * This can be helpful for schemas that support type extensions like Apollo Federation.
   */
  skipPruning?: PruneSchemaFilter;

  /**
   * Set to `true` to skip pruning object types or interfaces with no no fields
   */
  skipEmptyCompositeTypePruning?: boolean;
  /**
   * Set to `true` to skip pruning interfaces that are not implemented by any
   * other types
   */
  skipUnimplementedInterfacesPruning?: boolean;
  /**
   * Set to `true` to skip pruning empty unions
   */
  skipEmptyUnionPruning?: boolean;
  /**
   * Set to `true` to skip pruning unused types
   */
  skipUnusedTypesPruning?: boolean;
}

export type InputLeafValueTransformer = (type: GraphQLEnumType | GraphQLScalarType, originalValue: any) => any;
export type InputObjectValueTransformer = (
  type: GraphQLInputObjectType,
  originalValue: Record<string, any>
) => Record<string, any>;

// GraphQL v14 doesn't have it. Remove this once we drop support for v14
export type ASTVisitorKeyMap = Partial<Parameters<typeof visit>[2]>;

export enum DirectiveLocation {
  /** Request Definitions */
  QUERY = 'QUERY',
  MUTATION = 'MUTATION',
  SUBSCRIPTION = 'SUBSCRIPTION',
  FIELD = 'FIELD',
  FRAGMENT_DEFINITION = 'FRAGMENT_DEFINITION',
  FRAGMENT_SPREAD = 'FRAGMENT_SPREAD',
  INLINE_FRAGMENT = 'INLINE_FRAGMENT',
  VARIABLE_DEFINITION = 'VARIABLE_DEFINITION',
  /** Type System Definitions */
  SCHEMA = 'SCHEMA',
  SCALAR = 'SCALAR',
  OBJECT = 'OBJECT',
  FIELD_DEFINITION = 'FIELD_DEFINITION',
  ARGUMENT_DEFINITION = 'ARGUMENT_DEFINITION',
  INTERFACE = 'INTERFACE',
  UNION = 'UNION',
  ENUM = 'ENUM',
  ENUM_VALUE = 'ENUM_VALUE',
  INPUT_OBJECT = 'INPUT_OBJECT',
  INPUT_FIELD_DEFINITION = 'INPUT_FIELD_DEFINITION',
}

export type DirectiveLocationEnum = typeof DirectiveLocation;

/**
 * Prunes the provided schema, removing unused and empty types
 * @param schema The schema to prune
 * @param options Additional options for removing unused types from the schema
 */
export function pruneSchema(schema: GraphQLSchema, options: PruneSchemaOptions = {}): GraphQLSchema {
  const {
    skipEmptyCompositeTypePruning,
    skipEmptyUnionPruning,
    skipPruning,
    skipUnimplementedInterfacesPruning,
    skipUnusedTypesPruning,
  } = options;
  let prunedTypes: string[] = []; // Pruned types during mapping
  let prunedSchema: GraphQLSchema = schema;

  do {
    let visited = visitSchema(prunedSchema);

    // Custom pruning  was defined, so we need to pre-emptively revisit the schema accounting for this
    if (skipPruning) {
      const revisit = [];

      for (const typeName in prunedSchema.getTypeMap()) {
        if (typeName.startsWith('__')) {
          continue;
        }

        const type = prunedSchema.getType(typeName);

        // if we want to skip pruning for this type, add it to the list of types to revisit
        if (type && skipPruning(type)) {
          revisit.push(typeName);
        }
      }

      visited = visitQueue(revisit, prunedSchema, visited); // visit again
    }

    prunedTypes = [];

    prunedSchema = mapSchema(prunedSchema, {
      [MapperKind.TYPE]: type => {
        if (!visited.has(type.name) && !isSpecifiedScalarType(type)) {
          if (
            isUnionType(type) ||
            isInputObjectType(type) ||
            isInterfaceType(type) ||
            isObjectType(type) ||
            isScalarType(type)
          ) {
            // skipUnusedTypesPruning: skip pruning unused types
            if (skipUnusedTypesPruning) {
              return type;
            }
            // skipEmptyUnionPruning: skip pruning empty unions
            if (isUnionType(type) && skipEmptyUnionPruning && !Object.keys(type.getTypes()).length) {
              return type;
            }
            if (
              (isInputObjectType(type) || isInterfaceType(type) || isObjectType(type)) && // skipEmptyCompositeTypePruning: skip pruning object types or interfaces with no fields
              skipEmptyCompositeTypePruning &&
              !Object.keys(type.getFields()).length
            ) {
              return type;
            }
            // skipUnimplementedInterfacesPruning: skip pruning interfaces that are not implemented by any other types
            if (isInterfaceType(type) && skipUnimplementedInterfacesPruning) {
              return type;
            }
          }

          prunedTypes.push(type.name);
          visited.delete(type.name);

          return null;
        }
        return type;
      },
    });
  } while (prunedTypes.length); // Might have empty types and need to prune again

  return prunedSchema;
}

function visitSchema(schema: GraphQLSchema): Set<string> {
  const queue: string[] = []; // queue of nodes to visit

  // Grab the root types and start there
  for (const type of getRootTypes(schema)) {
    queue.push(type.name);
  }

  return visitQueue(queue, schema);
}

function visitQueue(queue: string[], schema: GraphQLSchema, visited: Set<string> = new Set<string>()): Set<string> {
  // Interfaces encountered that are field return types need to be revisited to add their implementations
  const revisit: Map<string, boolean> = new Map<string, boolean>();

  // Navigate all types starting with pre-queued types (root types)
  while (queue.length) {
    const typeName = queue.pop() as string;

    // Skip types we already visited unless it is an interface type that needs revisiting
    if (visited.has(typeName) && revisit[typeName] !== true) {
      continue;
    }

    const type = schema.getType(typeName);

    if (type) {
      // Get types for union
      if (isUnionType(type)) {
        queue.push(...type.getTypes().map(type => type.name));
      }
      // If it is an interface and it is a returned type, grab all implementations so we can use proper __typename in fragments
      if (isInterfaceType(type) && revisit[typeName] === true) {
        queue.push(...getImplementingTypes(type.name, schema));
        // No need to revisit this interface again
        revisit[typeName] = false;
      }
      // Visit interfaces this type is implementing if they haven't been visited yet
      if ('getInterfaces' in type) {
        // Only pushes to queue to visit but not return types
        queue.push(...type.getInterfaces().map(iface => iface.name));
      }
      // If the type has files visit those field types
      if ('getFields' in type) {
        const fields = type.getFields() as GraphQLFieldMap<any, any>;
        const entries = Object.entries(fields);

        if (!entries.length) {
          continue;
        }

        for (const [, field] of entries) {
          if (isObjectType(type)) {
            // Visit arg types
            queue.push(...field.args.map(arg => getNamedType(arg.type).name));
          }

          const namedType = getNamedType(field.type);

          queue.push(namedType.name);

          // Interfaces returned on fields need to be revisited to add their implementations
          if (isInterfaceType(namedType) && !(namedType.name in revisit)) {
            revisit[namedType.name] = true;
          }
        }
      }

      visited.add(typeName); // Mark as visited (and therefore it is used and should be kept)
    }
  }
  return visited;
}
