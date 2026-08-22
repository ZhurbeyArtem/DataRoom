import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [
    // Генерує дерево маршрутів із файлів у src/app/routes.
    // Має стояти ПЕРЕД react() — так вимагає плагін.
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
    alias: { '@': path.resolve(__dirname, './src') },
    // У монорепо частина пакетів іде з попередньо зібраних deps, частина —
    // напряму з node_modules, і React опиняється в дереві двічі. Наслідок —
    // "Invalid hook call" у компонентах бібліотек. dedupe змушує всіх
    // використовувати один екземпляр.
    dedupe: ['react', 'react-dom'],
  },
  server: { port: 5173 },
});
