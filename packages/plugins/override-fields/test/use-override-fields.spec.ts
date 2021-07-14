import { createTestkit } from '@envelop/testing';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { useOverrideFields } from '../src';

describe('useOverrideFields', () => {
  const schema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        countries: [Country!]
      }
      type Country {
        name: String!
        languages: [Language!]
        alphaCode2: String
        alphaCode3: String
      }
      type Language {
        code: ID!
        name: String
      }
    `,
    resolvers: {
      Query: {
        countries: () => [
          {
            alphaCode2: 'GB',
            alphaCode3: 'GBR',
            name: 'United Kingdom',
            languages: [
              {
                code: 'en',
                name: 'English',
              },
            ],
          },
          {
            alphaCode2: 'IT',
            alphaCode3: 'ITA',
            name: 'Italy',
            languages: [
              {
                code: 'it',
                name: 'Italian',
              },
            ],
          },
        ],
      },
    },
  });

  describe('default override logic and implementation', () => {
    it('Should correctly override root Type and field', async () => {
      const testInstance = createTestkit(
        [
          useOverrideFields({
            fields: ['Query.countries'],
          }),
        ],
        schema
      );

      const result = await testInstance.execute(`query { countries { alphaCode2 alphaCode3 languages { code name } } }`);
      expect(result.errors).toBeUndefined();
      expect(result.data.countries).toBe(null);
    });

    it('Should correctly override root Type and nested field', async () => {
      const testInstance = createTestkit(
        [
          useOverrideFields({
            fields: ['Query.countries.languages.name'],
          }),
        ],
        schema
      );

      const result = await testInstance.execute(`query { countries { alphaCode2 alphaCode3 languages { code name } } }`);
      expect(result.errors).toBeUndefined();
      expect(result.data.countries[0].languages[0].name).toBe(null);
      expect(result.data.countries[1].languages[0].name).toBe(null);
    });

    it('Should correctly override non-root Type and field', async () => {
      const testInstance = createTestkit(
        [
          useOverrideFields({
            fields: ['Country.alphaCode3'],
          }),
        ],
        schema
      );

      const result = await testInstance.execute(`query { countries { alphaCode2 alphaCode3 languages { code name } } }`);
      expect(result.errors).toBeUndefined();
      expect(result.data.countries[0].alphaCode2).toBe('GB');
      expect(result.data.countries[0].alphaCode3).toBe(null);
      expect(result.data.countries[1].alphaCode2).toBe('IT');
      expect(result.data.countries[1].alphaCode3).toBe(null);
    });

    it('Should correctly override using a Regular Expression', async () => {
      const testInstance = createTestkit(
        [
          useOverrideFields({
            fields: [/Country\.alphaCode.*/],
          }),
        ],
        schema
      );

      const result = await testInstance.execute(`query { countries { alphaCode2 alphaCode3 languages { code name } } }`);
      expect(result.errors).toBeUndefined();
      expect(result.data.countries[0].alphaCode2).toBe(null);
      expect(result.data.countries[0].alphaCode3).toBe(null);
      expect(result.data.countries[1].alphaCode2).toBe(null);
      expect(result.data.countries[1].alphaCode3).toBe(null);
    });
  });

  describe('custom override logic with default implementation', () => {
    it('Should not override "plain string fields" when `shouldOverride` returns false', async () => {
      const testInstance = createTestkit(
        [
          useOverrideFields({
            fields: ['Query.countries.languages.name'],
            shouldOverride: () => false,
          }),
        ],
        schema
      );

      const result = await testInstance.execute(`query { countries { alphaCode2 alphaCode3 languages { code name } } }`);
      expect(result.errors).toBeUndefined();
      expect(result.data.countries[0].languages[0].name).toBe('English');
      expect(result.data.countries[1].languages[0].name).toBe('Italian');
    });

    it('Should override "plain string fields" when `shouldOverride` returns true', async () => {
      const testInstance = createTestkit(
        [
          useOverrideFields({
            fields: ['Query.countries.languages.name'],
            shouldOverride: () => true,
          }),
        ],
        schema
      );

      const result = await testInstance.execute(`query { countries { alphaCode2 alphaCode3 languages { code name } } }`);
      expect(result.errors).toBeUndefined();
      expect(result.data.countries[0].languages[0].name).toBe(null);
      expect(result.data.countries[1].languages[0].name).toBe(null);
    });

    it('Should not override "regex fields" when `shouldOverride` returns false', async () => {
      const testInstance = createTestkit(
        [
          useOverrideFields({
            fields: [/Country\.alphaCode.*/],
            shouldOverride: () => false,
          }),
        ],
        schema
      );

      const result = await testInstance.execute(`query { countries { alphaCode2 alphaCode3 languages { code name } } }`);
      expect(result.errors).toBeUndefined();
      expect(result.data.countries[0].alphaCode2).toBe('GB');
      expect(result.data.countries[0].alphaCode3).toBe('GBR');
      expect(result.data.countries[1].alphaCode2).toBe('IT');
      expect(result.data.countries[1].alphaCode3).toBe('ITA');
    });

    it('Should override "regex fields" when `shouldOverride` returns true', async () => {
      const testInstance = createTestkit(
        [
          useOverrideFields({
            fields: [/Country\.alphaCode.*/],
            shouldOverride: () => true,
          }),
        ],
        schema
      );

      const result = await testInstance.execute(`query { countries { alphaCode2 alphaCode3 languages { code name } } }`);
      expect(result.errors).toBeUndefined();
      expect(result.data.countries[0].alphaCode2).toBe(null);
      expect(result.data.countries[0].alphaCode3).toBe(null);
      expect(result.data.countries[1].alphaCode2).toBe(null);
      expect(result.data.countries[1].alphaCode3).toBe(null);
    });
  });

  describe('default override logic with custom implementation', () => {
    it('Should return custom value, as implemented in `overrideFn` when overriding "plain string fields"', async () => {
      const testInstance = createTestkit(
        [
          useOverrideFields({
            fields: ['Query.countries.languages.name'],
            overrideFn: () => 'customName',
          }),
        ],
        schema
      );

      const result = await testInstance.execute(`query { countries { alphaCode2 alphaCode3 languages { code name } } }`);
      expect(result.errors).toBeUndefined();
      expect(result.data.countries[0].languages[0].name).toBe('customName');
      expect(result.data.countries[1].languages[0].name).toBe('customName');
    });

    it('Should return custom value, as implemented in `overrideFn` when overriding "regex fields"', async () => {
      const testInstance = createTestkit(
        [
          useOverrideFields({
            fields: [/Country\.alphaCode.*/],
            overrideFn: () => 'customAlphaCode',
          }),
        ],
        schema
      );

      const result = await testInstance.execute(`query { countries { alphaCode2 alphaCode3 languages { code name } } }`);
      expect(result.errors).toBeUndefined();
      expect(result.data.countries[0].alphaCode2).toBe('customAlphaCode');
      expect(result.data.countries[0].alphaCode3).toBe('customAlphaCode');
      expect(result.data.countries[1].alphaCode2).toBe('customAlphaCode');
      expect(result.data.countries[1].alphaCode3).toBe('customAlphaCode');
    });
  });

  describe('custom override logic plus custom implementation', () => {
    it('Should correctly override "plain string fields"', async () => {
      const testInstance = createTestkit(
        [
          useOverrideFields({
            fields: ['Query.countries.languages.name'],
            shouldOverride: () => true,
            overrideFn: () => 'customName',
          }),
        ],
        schema
      );

      const result = await testInstance.execute(`query { countries { alphaCode2 alphaCode3 languages { code name } } }`);
      expect(result.errors).toBeUndefined();
      expect(result.data.countries[0].languages[0].name).toBe('customName');
      expect(result.data.countries[1].languages[0].name).toBe('customName');
    });

    it('Should correctly not override "plain string fields"', async () => {
      const testInstance = createTestkit(
        [
          useOverrideFields({
            fields: ['Query.countries.languages.name'],
            shouldOverride: () => false,
            overrideFn: () => 'customName',
          }),
        ],
        schema
      );

      const result = await testInstance.execute(`query { countries { alphaCode2 alphaCode3 languages { code name } } }`);
      expect(result.errors).toBeUndefined();
      expect(result.data.countries[0].languages[0].name).toBe('English');
      expect(result.data.countries[1].languages[0].name).toBe('Italian');
    });

    it('Should correctly override "regex fields"', async () => {
      const testInstance = createTestkit(
        [
          useOverrideFields({
            fields: [/Country\.alphaCode.*/],
            shouldOverride: () => true,
            overrideFn: () => 'customAlphaCode',
          }),
        ],
        schema
      );

      const result = await testInstance.execute(`query { countries { alphaCode2 alphaCode3 languages { code name } } }`);
      expect(result.errors).toBeUndefined();
      expect(result.data.countries[0].alphaCode2).toBe('customAlphaCode');
      expect(result.data.countries[0].alphaCode3).toBe('customAlphaCode');
      expect(result.data.countries[1].alphaCode2).toBe('customAlphaCode');
      expect(result.data.countries[1].alphaCode3).toBe('customAlphaCode');
    });

    it('Should correctly not override "regex fields"', async () => {
      const testInstance = createTestkit(
        [
          useOverrideFields({
            fields: [/Country\.alphaCode.*/],
            shouldOverride: () => false,
            overrideFn: () => 'customAlphaCode',
          }),
        ],
        schema
      );

      const result = await testInstance.execute(`query { countries { alphaCode2 alphaCode3 languages { code name } } }`);
      expect(result.errors).toBeUndefined();
      expect(result.data.countries[0].alphaCode2).toBe('GB');
      expect(result.data.countries[0].alphaCode3).toBe('GBR');
      expect(result.data.countries[1].alphaCode2).toBe('IT');
      expect(result.data.countries[1].alphaCode3).toBe('ITA');
    });
  });
});
