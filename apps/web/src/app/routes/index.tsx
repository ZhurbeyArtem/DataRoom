import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-medium">Data Room</h1>
      <p className="mt-2 text-neutral-600">
        Скелет застосунку піднято. Екрани зʼявляться в наступних задачах.
      </p>
    </main>
  );
}
