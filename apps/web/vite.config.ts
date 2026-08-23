import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [
    // Generates the route tree from the files in src/app/routes.
    // Must come BEFORE react() — the plugin requires it.
    tanstackRouter({
      routesDirectory: './src/app/routes',
      generatedRouteTree: './src/app/routeTree.gen.ts',
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    // In a monorepo some packages come from pre-bundled deps and some
    // straight from node_modules, which puts React in the tree twice. The
    // result is "Invalid hook call" inside library components. dedupe forces
    // everyone onto one instance.
    dedupe: ['react', 'react-dom'],
  },
  // strictPort: if 5173 is taken it is better to fail than to quietly come
  // up on another port — otherwise the browser talks to a stale server.
  server: { port: 5173, strictPort: true },
});
