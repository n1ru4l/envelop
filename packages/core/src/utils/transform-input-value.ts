import {
  GraphQLInputType,
  getNullableType,
  isLeafType,
  isListType,
  isInputObjectType,
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLNamedType,
  GraphQLScalarType,
  visit,
} from '@envelop/graphql';

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

export function transformInputValue(
  type: GraphQLInputType,
  value: any,
  inputLeafValueTransformer: Maybe<InputLeafValueTransformer> = null,
  inputObjectValueTransformer: Maybe<InputObjectValueTransformer> = null
): any {
  if (value == null) {
    return value;
  }

  const nullableType = getNullableType(type);

  if (isLeafType(nullableType)) {
    return inputLeafValueTransformer != null ? inputLeafValueTransformer(nullableType, value) : value;
  } else if (isListType(nullableType)) {
    return value.map((listMember: any) =>
      transformInputValue(nullableType.ofType, listMember, inputLeafValueTransformer, inputObjectValueTransformer)
    );
  } else if (isInputObjectType(nullableType)) {
    const fields = nullableType.getFields();
    const newValue = {};
    for (const key in value) {
      const field = fields[key];
      if (field != null) {
        newValue[key] = transformInputValue(
          field.type,
          value[key],
          inputLeafValueTransformer,
          inputObjectValueTransformer
        );
      }
    }
    return inputObjectValueTransformer != null ? inputObjectValueTransformer(nullableType, newValue) : newValue;
  }

  // unreachable, no other possible return value
}

export function serializeInputValue(type: GraphQLInputType, value: any) {
  return transformInputValue(type, value, (t, v) => {
    try {
      return t.serialize(v);
    } catch {
      return v;
    }
  });
}

export function parseInputValue(type: GraphQLInputType, value: any) {
  return transformInputValue(type, value, (t, v) => {
    try {
      return t.parseValue(v);
    } catch {
      return v;
    }
  });
}

export function parseInputValueLiteral(type: GraphQLInputType, value: any) {
  return transformInputValue(type, value, (t, v) => t.parseLiteral(v, {}));
}
