/**
 * The application's only Vercel Function, and its only outbound network call.
 *
 * Everything the browser knows about Google Books it learns through here, so the
 * credential stays on the server. The logic lives in ../server/enrich-core.ts;
 * this file is only the runtime edge — every file under api/ becomes its own
 * Function, and the slice is specified to have exactly one.
 */

import { EXTERNAL_TIMEOUT_MS, handleEnrich } from '../server/enrich-core';

export default {
  async fetch(request: Request): Promise<Response> {
    return handleEnrich(request, {
      apiKey: process.env['GOOGLE_BOOKS_API_KEY'],
      fetchImpl: fetch,
      timeoutMs: EXTERNAL_TIMEOUT_MS,
    });
  },
};
