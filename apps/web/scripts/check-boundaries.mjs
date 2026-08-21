/**
 * Перевірка односторонніх залежностей за bulletproof-react.
 *
 * Канонічно це робить eslint-плагін import через no-restricted-paths, але
 * стандартний лінтер цього шаблону — oxlint — такого правила не має, а тягти
 * другий лінтер заради одного правила дорожче, ніж написати перевірку.
 *
 * Правило одне: залежності течуть в один бік.
 *   спільний шар  →  features  →  app
 * Отже:
 *   - спільний шар (components, hooks, lib, utils, config, types) не знає
 *     ні про features, ні про app;
 *   - features не знають про app;
 *   - features не знають одна про одну — усередині фічі імпорти відносні.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const SRC = new URL('../src/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const SHARED = ['components', 'hooks', 'lib', 'utils', 'config', 'types'];

const rules = [
  {
    when: (dir) => SHARED.includes(dir),
    forbid: /^@\/(features|app)\//,
    why: 'спільний шар не може залежати від features чи app',
  },
  {
    when: (dir) => dir === 'features',
    forbid: /^@\/app\//,
    why: 'features не може залежати від app',
  },
];

const IMPORT_RE = /(?:^|\n)\s*(?:import|export)[\s\S]*?from\s+['"]([^'"]+)['"]/g;

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (/\.tsx?$/.test(full) && !full.endsWith('.gen.ts')) yield full;
  }
}

const violations = [];

for (const file of walk(SRC)) {
  const rel = relative(SRC, file);
  const [layer, feature] = rel.split(sep);
  const source = readFileSync(file, 'utf8');

  for (const match of source.matchAll(IMPORT_RE)) {
    const spec = match[1];

    for (const rule of rules) {
      if (rule.when(layer) && rule.forbid.test(spec)) {
        violations.push({ rel, spec, why: rule.why });
      }
    }

    // Крос-імпорт між фічами: усередині фічі шлях має бути відносним.
    if (layer === 'features') {
      const other = spec.match(/^@\/features\/([^/]+)/);
      if (other && other[1] !== feature) {
        violations.push({
          rel,
          spec,
          why: `фіча "${feature}" не може залежати від фічі "${other[1]}"`,
        });
      }
    }
  }
}

if (violations.length === 0) {
  console.log('межі шарів дотримано');
  process.exit(0);
}

console.error(`порушень меж: ${violations.length}\n`);
for (const v of violations) {
  console.error(`  ${v.rel}`);
  console.error(`    імпорт: ${v.spec}`);
  console.error(`    чому:   ${v.why}\n`);
}
process.exit(1);
