import type { ParserCacheOptions } from '@envelop/parser-cache';
import type { ValidationCacheOptions } from '@envelop/validation-cache';
import type { Plugin } from '@envelop/core';

export type CacheOptions =
  | boolean
  | {
      /**
       * Enable/Disable or configure cache options
       * @default true
       */
      parse?: boolean | ParserCacheOptions;
      /**
       * Enable/Disable or configure cache options
       * @default true
       */
      validation?: boolean | ValidationCacheOptions;
    };

export interface WithCache {
  /**
   * Enable/Disable/Configure in-memory cache that improves performance
   *
   * `cache === true` => Enable both parse & validation cache
   *
   * `cache === false` => Disable caching
   *
   * @default true
   */
  cache?: CacheOptions;
}

export function handleCache({ cache = true }: WithCache, plugins: Plugin[]): void | Promise<unknown> {
  if (!cache) return;

  const isParserEnabled = cache === true || !!cache.parse;
  const isValidationEnabled = cache === true || !!cache.validation;

  const parserOptions = cache === true ? {} : typeof cache.parse === 'object' ? cache.parse : {};

  const validationOptions = cache === true ? {} : typeof cache.validation === 'object' ? cache.validation : {};

  return Promise.all([
    isParserEnabled
      ? import('@envelop/parser-cache').then(({ useParserCache }) => {
          plugins.push(useParserCache(parserOptions));
        })
      : null,
    isValidationEnabled
      ? import('@envelop/validation-cache').then(({ useValidationCache }) => {
          plugins.push(useValidationCache(validationOptions));
        })
      : null,
  ]);
}
