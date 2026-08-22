import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import { fileURLToPath } from 'node:url';

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
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    // У монорепо частина пакетів іде з попередньо зібраних deps, частина —
    // напряму з node_modules, і React опиняється в дереві двічі. Наслідок —
    // "Invalid hook call" у компонентах бібліотек. dedupe змушує всіх
    // використовувати один екземпляр.
    dedupe: ['react', 'react-dom'],
  },
  // strictPort: якщо 5173 зайнятий, краще впасти, ніж мовчки піднятися
  // на іншому порту — інакше браузер говоритиме зі старим сервером.
  server: { port: 5173, strictPort: true },
});
