/**
 * One-way dependency check, following bulletproof-react.
 *
 * The canonical way is the eslint import plugin with no-restricted-paths,
 * but this template's default linter — oxlint — has no such rule, and pulling
 * in a second linter for one rule costs more than writing the check.
 *
 * One rule: dependencies flow in a single direction.
 *   shared layer  →  features  →  app
 * Therefore:
 *   - the shared layer (components, hooks, lib, utils, config, types) knows
 *     nothing about features or app;
 *   - features know nothing about app;
 *   - features know nothing about each other — inside a feature imports are
 *     relative.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const SRC = new URL('../src/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const SHARED = ['components', 'hooks', 'lib', 'utils', 'config', 'types'];

const rules = [
  {
    when: (dir) => SHARED.includes(dir),
    forbid: /^@\/(features|app)\//,
    why: 'the shared layer cannot depend on features or app',
  },
  {
    when: (dir) => dir === 'features',
    forbid: /^@\/app\//,
    why: 'features cannot depend on app',
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

    // A cross-feature import: inside a feature the path must be relative.
    if (layer === 'features') {
      const other = spec.match(/^@\/features\/([^/]+)/);
      if (other && other[1] !== feature) {
        violations.push({
          rel,
          spec,
          why: `feature "${feature}" cannot depend on feature "${other[1]}"`,
        });
      }
    }
  }
}

if (violations.length === 0) {
  console.log('layer boundaries respected');
  process.exit(0);
}

console.error(`boundary violations: ${violations.length}\n`);
for (const v of violations) {
  console.error(`  ${v.rel}`);
  console.error(`    import: ${v.spec}`);
  console.error(`    why:    ${v.why}\n`);
}
process.exit(1);
