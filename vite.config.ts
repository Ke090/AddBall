import { defineConfig } from 'vitest/config';
export default defineConfig({
  // Keep generated asset URLs relative so the build also works below a subpath.
  base: './',
  test: { environment: 'node' },
});
