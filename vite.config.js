import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: { game: 'index.html', showcase: 'showcase.html', player: 'player.html' },
      output: { manualChunks: { engine: ['three'] } },
    },
  },
});
