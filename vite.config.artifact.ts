import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Dedicated build config for a single self-contained HTML file (used to
// publish the game as a Claude Artifact) — inlines the JS bundle and CSS
// directly into index.html instead of the normal hashed-filename
// dist/assets/*.js|css that the real GitHub Pages deploy uses. Kept
// separate from vite.config.ts so this doesn't affect the normal
// dev/build/test flow.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: 'dist-artifact',
    emptyOutDir: true,
  },
})
