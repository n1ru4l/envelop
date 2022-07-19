import { dedent, dedentString } from '../../__testUtils__/dedent.js';
import { kitchenSinkQuery } from '../../__testUtils__/kitchenSinkQuery.js';

import { Kind } from '../kinds.js';
import { parse } from '../parser.js';
import { print } from '../printer.js';

describe('Printer: Query document', () => {
  it('prints minimal ast', () => {
    const ast = {
      kind: Kind.FIELD,
      name: { kind: Kind.NAME, value: 'foo' },
    } as const;
    expect(print(ast)).toEqual('foo');
  });

  it('produces helpful error messages', () => {
    const badAST = { random: 'Data' };

    // @ts-expect-error
    expect(() => print(badAST)).toThrow('Invalid AST Node: { random: "Data" }.');
  });

  it('correctly prints non-query operations without name', () => {
    const queryASTShorthanded = parse('query { id, name }');
    expect(print(queryASTShorthanded)).toEqual(dedent`
      {
        id
        name
      }
    `);

    const mutationAST = parse('mutation { id, name }');
    expect(print(mutationAST)).toEqual(dedent`
      mutation {
        id
        name
      }
    `);

    const queryASTWithArtifacts = parse('query ($foo: TestType) @testDirective { id, name }');
    expect(print(queryASTWithArtifacts)).toEqual(dedent`
      query ($foo: TestType) @testDirective {
        id
        name
      }
    `);

    const mutationASTWithArtifacts = parse('mutation ($foo: TestType) @testDirective { id, name }');
    expect(print(mutationASTWithArtifacts)).toEqual(dedent`
      mutation ($foo: TestType) @testDirective {
        id
        name
      }
    `);
  });

  it('prints query with variable directives', () => {
    const queryASTWithVariableDirective = parse(
      'query ($foo: TestType = { a: 123 } @testDirective(if: true) @test) { id }'
    );
    expect(print(queryASTWithVariableDirective)).toEqual(dedent`
      query ($foo: TestType = { a: 123 } @testDirective(if: true) @test) {
        id
      }
    `);
  });

  it('keeps arguments on one line if line is short (<= 80 chars)', () => {
    const printed = print(parse('{trip(wheelchair:false arriveBy:false){dateTime}}'));

    expect(printed).toEqual(dedent`
      {
        trip(wheelchair: false, arriveBy: false) {
          dateTime
        }
      }
    `);
  });

  it('puts arguments on multiple lines if line is long (> 80 chars)', () => {
    const printed = print(
      parse(
        '{trip(wheelchair:false arriveBy:false includePlannedCancellations:true transitDistanceReluctance:2000){dateTime}}'
      )
    );

    expect(printed).toEqual(dedent`
      {
        trip(
          wheelchair: false
          arriveBy: false
          includePlannedCancellations: true
          transitDistanceReluctance: 2000
        ) {
          dateTime
        }
      }
    `);
  });

  it('Legacy: prints fragment with variable directives', () => {
    const queryASTWithVariableDirective = parse(
      'fragment Foo($foo: TestType @test) on TestType @testDirective { id }',
      { allowLegacyFragmentVariables: true }
    );
    expect(print(queryASTWithVariableDirective)).toEqual(dedent`
      fragment Foo($foo: TestType @test) on TestType @testDirective {
        id
      }
    `);
  });

  it('Legacy: correctly prints fragment defined variables', () => {
    const fragmentWithVariable = parse(
      `
        fragment Foo($a: ComplexType, $b: Boolean = false) on TestType {
          id
        }
      `,
      { allowLegacyFragmentVariables: true }
    );
    expect(print(fragmentWithVariable)).toEqual(dedent`
      fragment Foo($a: ComplexType, $b: Boolean = false) on TestType {
        id
      }
    `);
  });

  it('prints kitchen sink without altering ast', () => {
    const ast = parse(kitchenSinkQuery, {
      noLocation: true,
      experimentalClientControlledNullability: true,
    });

    const astBeforePrintCall = JSON.stringify(ast);
    const printed = print(ast);
    const printedAST = parse(printed, {
      noLocation: true,
      experimentalClientControlledNullability: true,
    });

    expect(printedAST).toEqual(ast);
    expect(JSON.stringify(ast)).toEqual(astBeforePrintCall);

    expect(printed).toEqual(
      dedentString(String.raw`
      query queryName($foo: ComplexType, $site: Site = MOBILE) @onQuery {
        whoever123is: node(id: [123, 456]) {
          id
          ... on User @onInlineFragment {
            field2 {
              id
              alias: field1(first: 10, after: $foo) @include(if: $foo) {
                id
                ...frag @onFragmentSpread
              }
            }
            field3!
            field4?
            requiredField5: field5!
            requiredSelectionSet(first: 10)! @directive {
              field
            }
            unsetListItemsRequiredList: listField[]!
            requiredListItemsUnsetList: listField[!]
            requiredListItemsRequiredList: listField[!]!
            unsetListItemsOptionalList: listField[]?
            optionalListItemsUnsetList: listField[?]
            optionalListItemsOptionalList: listField[?]?
            multidimensionalList: listField[[[!]!]!]!
          }
          ... @skip(unless: $foo) {
            id
          }
          ... {
            id
          }
        }
      }

      mutation likeStory @onMutation {
        like(story: 123) @onField {
          story {
            id @onField
          }
        }
      }

      subscription StoryLikeSubscription($input: StoryLikeSubscribeInput @onVariableDefinition) @onSubscription {
        storyLikeSubscribe(input: $input) {
          story {
            likers {
              count
            }
            likeSentence {
              text
            }
          }
        }
      }

      fragment frag on Friend @onFragmentDefinition {
        foo(
          size: $size
          bar: $b
          obj: { key: "value", block: """
          block string uses \"""
          """ }
        )
      }

      {
        unnamed(truthy: true, falsy: false, nullish: null)
        query
      }

      {
        __typename
      }
    `)
    );
  });
});
