/// <reference types="node" />

/**
 * The reference above is load-bearing. Vercel typechecks this file against the
 * repository's root tsconfig.json, and it cannot follow that file's project
 * references — a documented limitation — so it never sees tsconfig.api.json's
 * `types: ["node"]` and reports `Cannot find name 'process'` during the build.
 * Declaring the dependency here fixes it without putting Node globals on the
 * browser side.
 */

/**
 * The application's only Vercel Function, and its only outbound network call.
 *
 * Everything the browser knows about Google Books it learns through here, so the
 * credential stays on the server. The logic lives in ../server/enrich-core.ts;
 * this file is only the runtime edge — every file under api/ becomes its own
 * Function, and the slice is specified to have exactly one.
 */

// The .js extension is required, not stylistic. Vercel transpiles this file
// rather than bundling it, so Node's ESM resolver sees the specifier verbatim,
// and it does not guess extensions. TypeScript maps '.js' back to the '.ts'
// source, so the same line satisfies both.
import { EXTERNAL_TIMEOUT_MS, handleEnrich } from '../server/enrich-core.js';

export default {
  async fetch(request: Request): Promise<Response> {
    return handleEnrich(request, {
      apiKey: process.env['GOOGLE_BOOKS_API_KEY'],
      fetchImpl: fetch,
      timeoutMs: EXTERNAL_TIMEOUT_MS,
    });
  },
};
