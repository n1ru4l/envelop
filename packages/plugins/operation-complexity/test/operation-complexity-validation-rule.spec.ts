import { buildSchema, DocumentNode, GraphQLSchema, parse, TypeInfo, ValidationContext, visit, visitWithTypeInfo } from 'graphql';
import { OperationComplexityFieldCosts, OperationComplexityValidationRule } from '../src/operation-complexity-validation-rule';

const createSchema = () =>
  buildSchema(/* GraphQL */ `
    type Query {
      user(id: ID!): User!
      node(id: ID!): Node
      ping: Boolean
      mostUsedPostType: PostType
      postOrUser: PostOrUser
    }

    union PostOrUser = Post | User

    interface Node {
      id: ID!
    }

    type User implements Node {
      id: ID!
      latestPost: Post
    }

    type Post implements Node {
      id: ID!
      type: PostType!
    }

    enum PostType {
      curated
      flagged
    }
  `);

const runRule = (
  document: DocumentNode,
  opts?: {
    schema?: GraphQLSchema;
    fieldCosts?: Partial<OperationComplexityFieldCosts>;
  }
) => {
  const schema = opts?.schema ?? createSchema();
  const typeInfo = new TypeInfo(schema);
  const errors: Array<unknown> = [];
  const validationContext = new ValidationContext(schema, document, typeInfo, e => {
    errors.push(e);
  });

  let totalCost: number | undefined;
  const visitor = OperationComplexityValidationRule({
    reportTotalCost(reportedTotalCost) {
      totalCost = reportedTotalCost;
    },
    fieldCosts: opts?.fieldCosts,
  })(validationContext, { schema, document });

  visit(document, visitWithTypeInfo(typeInfo, visitor));

  return totalCost;
};

describe('OperationComplexityValidationRule', () => {
  it('calculates and report query cost (single object field)', () => {
    const document = parse(/* GraphQL */ `
      query {
        # cost 1
        user(id: "1") {
          # cost 0
          id
        }
      }
    `);
    const totalCost = runRule(document);
    expect(totalCost).toEqual(1);
  });
  it('calculates and report query cost (two object fields)', () => {
    const document = parse(/* GraphQL */ `
      query {
        # cost 1
        user(id: "1") {
          # cost 0
          id
        }
        # cost 1
        u2: user(id: "2") {
          # cost 0
          id
        }
      }
    `);
    const totalCost = runRule(document);
    expect(totalCost).toEqual(2);
  });
  it('calculates and report query cost (nested object fields)', () => {
    const document = parse(/* GraphQL */ `
      query {
        # cost 1
        user(id: "1") {
          # cost 0
          id
          # cost 1
          latestPost {
            # cost 0
            id
          }
        }
      }
    `);
    const totalCost = runRule(document);
    expect(totalCost).toEqual(2);
  });
  it('calculates and report query cost (single interface field)', () => {
    const document = parse(/* GraphQL */ `
      query {
        # cost 1
        node(id: "1") {
          ... on User {
            # cost 0
            id
          }
        }
      }
    `);
    const totalCost = runRule(document);
    expect(totalCost).toEqual(1);
  });
  it('calculates and report query cost (single union field)', () => {
    const document = parse(/* GraphQL */ `
      query {
        # cost 1
        postOrUser(id: "1") {
          ... on User {
            id
          }
          ... on Post {
            id
          }
        }
      }
    `);
    const totalCost = runRule(document);
    expect(totalCost).toEqual(1);
  });
  it('calculates and report query cost (single scalar field)', () => {
    const document = parse(/* GraphQL */ `
      query {
        # cost 0
        ping
      }
    `);
    const totalCost = runRule(document);
    expect(totalCost).toEqual(0);
  });
  it('calculates and report query cost (single enum field)', () => {
    const document = parse(/* GraphQL */ `
      query {
        # cost 0
        mostUsedPostType
      }
    `);
    const totalCost = runRule(document);
    expect(totalCost).toEqual(0);
  });
  it('calculates and reports query cost with custom score (scalar)', () => {
    const document = parse(/* GraphQL */ `
      query {
        # cost 10
        ping
      }
    `);
    const totalCost = runRule(document, {
      fieldCosts: {
        scalar: 10,
      },
    });
    expect(totalCost).toEqual(10);
  });
  it('calculates and reports query cost with custom score (object)', () => {
    const document = parse(/* GraphQL */ `
      query {
        # cost 10
        user(id: "1") {
          # cost 0
          id
        }
      }
    `);
    const totalCost = runRule(document, {
      fieldCosts: {
        object: 10,
      },
    });
    expect(totalCost).toEqual(10);
  });
  it('calculates and reports query cost with custom score (enum)', () => {
    const document = parse(/* GraphQL */ `
      query {
        # cost 10
        mostUsedPostType
      }
    `);
    const totalCost = runRule(document, {
      fieldCosts: {
        enum: 10,
      },
    });
    expect(totalCost).toEqual(10);
  });
  it('calculates and reports query cost with custom score (interface)', () => {
    const document = parse(/* GraphQL */ `
      query {
        node(id: "1") {
          id
        }
      }
    `);
    const totalCost = runRule(document, {
      fieldCosts: {
        interface: 10,
      },
    });
    expect(totalCost).toEqual(10);
  });
  it('calculates and reports query cost with custom score (union)', () => {
    const document = parse(/* GraphQL */ `
      query {
        # cost 10
        postOrUser(id: "1") {
          # cost 0
          ... on User {
            id
          }
          # cost 0
          ... on Post {
            id
          }
        }
      }
    `);
    const totalCost = runRule(document, {
      fieldCosts: {
        union: 10,
      },
    });
    expect(totalCost).toEqual(10);
  });
  it('respects custom cost defined via field extension fields.', () => {
    const schema = createSchema();
    const queryType = schema.getQueryType()!;

    queryType.getFields()['ping'].extensions = {
      queryComplexity: {
        cost: 420,
      },
    };

    const document = parse(/* GraphQL */ `
      query {
        ping
      }
    `);
    const totalCost = runRule(document, { schema });
    expect(totalCost).toEqual(420);
  });
  it('respects custom cost defined via type extension fields', () => {
    const schema = createSchema();
    const booleanType = schema.getType('Boolean')!;

    booleanType.extensions = {
      queryComplexity: {
        cost: 419,
      },
    };

    const document = parse(/* GraphQL */ `
      query {
        ping
      }
    `);
    const totalCost = runRule(document, { schema });
    expect(totalCost).toEqual(419);
  });
});
