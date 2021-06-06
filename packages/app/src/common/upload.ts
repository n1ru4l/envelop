import type { UploadOptions } from 'graphql-upload';

export type GraphQLUploadConfig = boolean | UploadOptions;

export interface WithGraphQLUpload {
  /**
   * Enable __GraphQL Upload__ support
   *
   * @see [https://github.com/jaydenseric/graphql-upload](https://github.com/jaydenseric/graphql-upload)
   *
   * When enabled, please make sure to install in your project: `graphql-upload` and `@types/graphql-upload`
   *
   * @default false
   */
  GraphQLUpload?: GraphQLUploadConfig;
}
