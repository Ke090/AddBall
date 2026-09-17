import { defineConfig } from 'vitest/config';
export default defineConfig({
  // 相対パスにすることで、ドメイン直下とGitHub Pagesのサブパス配信の両方に対応する。
  base: './',
  test: { environment: 'node' },
});
