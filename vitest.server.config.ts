import { defineConfig } from 'vitest/config';

/**
 * The server tests run separately from the Angular ones.
 *
 * `ng test` drives Vitest through @angular/build's unit-test builder, which is
 * scoped to the Angular project (jsdom, tsconfig.spec.json, src/**). The
 * Function's logic lives outside src/ and needs a plain Node environment, so it
 * gets its own config. `npm test` runs both.
 */
export default defineConfig({
  test: {
    name: 'server',
    environment: 'node',
    include: ['server/**/*.spec.ts'],
  },
});
