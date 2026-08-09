import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';

import matter from 'gray-matter';

const directory = new URL('../src/content/docs/wardline/', import.meta.url);
const expected = {
  'index.mdx': ['Wardline', 0, [
    'There is no Java binding, no manifest, no exception register',
    'Five states reachable by default',
    'designed specification was a good threat model and a poor implementation plan',
  ]],
  'what-a-wardline-is.mdx': ['What a Wardline Is', 1, [
    'a wardline is not a document about a codebase; it is a property of one',
    'developer-freedom zone',
    'runtime behaviour is **to do nothing**',
  ]],
  'problem-and-non-goals.mdx': ['The Problem and Non-Goals', 2, [
    'The rule designed to do that',
    'five entries are covered or partially covered',
    'Wardline is silent until you opt in',
  ]],
  'trust-lattice.mdx': ['The Trust Lattice', 3, [
    'least_trusted',
    'The implementation declares eight states and produces five',
    'The rooms were specified; the staircase to them never was',
  ]],
  'declarations-and-trust-grants.mdx': ['Declarations and Trust Grants', 4, [
    'That inversion is the strongest idea in the codebase',
    'Repository **configuration** cannot self-authorise the scan gate',
    'the config file is never read',
  ]],
  'gates-suppression-and-judge.mdx': ['Gates, Suppression, and the Judge', 6, [
    'GateDecision',
    'waiver > judged > baseline',
    'Judging is manual and opt-in; its consequences are automatic and persistent',
  ]],
  'verification.mdx': ['Verification Properties', 7, [
    'approximately **4,050 test functions across 330 files**',
    'Measured recall',
    'byte-identity',
  ]],
  'residual-risks.mdx': ['Residual Risks', 8, [
    'enforcement is structurally correct and semantically meaningless',
    'dependency surface is covered by enumeration',
    'HMAC-SHA256',
  ]],
  'roadmap-the-unbuilt.mdx': ['Roadmap: The Unbuilt', 9, [
    'Nothing on this page is a commitment',
    'The rooms were specified and the staircase was never built',
    'Cross-language taint propagation',
  ]],
  'language-frontends.mdx': ['Language Frontends', 10, [
    'analyses two languages and is implemented in one',
    'run_scan',
    'an ungated frontend is a preview by definition',
  ]],
  'python-reference.mdx': ['Python Reference', 11, [
    'Python 3.12 or later',
    'Nineteen commands',
    'Scan the project root',
  ]],
};

async function pages() {
  return Object.fromEntries(await Promise.all(Object.keys(expected).map(async (file) => [
    file,
    await readFile(new URL(file, directory), 'utf8').catch(() => ''),
  ])));
}

function proseOutsideFences(source) {
  return source.replace(/```[\s\S]*?```/g, '');
}

async function wardlineRoutes(current = directory, prefix = '') {
  const routes = new Set();
  for (const entry of await readdir(current, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      for (const route of await wardlineRoutes(new URL(`${entry.name}/`, current), `${prefix}${entry.name}/`)) routes.add(route);
    } else if (/\.mdx?$/.test(entry.name)) {
      const stem = entry.name.replace(/\.mdx?$/, '');
      routes.add(`/wardline/${prefix}${stem === 'index' ? '' : `${stem}/`}`);
    }
  }
  return routes;
}

test('Wardline practitioner section has the exact planned MDX inventory, titles, and orders', async () => {
  const files = (await readdir(directory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && /\.mdx?$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
  assert.deepEqual(files, Object.keys(expected).sort());

  for (const [file, [title, order]] of Object.entries(expected)) {
    const source = await readFile(new URL(file, directory), 'utf8');
    assert.deepEqual(matter(source).data, { title, sidebar: { order } }, file);
  }
});

test('every page preserves at least three distinctive source-governed claims', async () => {
  for (const [file, source] of Object.entries(await pages())) {
    for (const claim of expected[file][2]) assert.ok(source.includes(claim), `${file}: ${claim}`);
  }
});

test('conversion leaves no Hugo, MkDocs, same-origin, or root-relative residue', async () => {
  for (const [file, source] of Object.entries(await pages())) {
    const prose = proseOutsideFences(source);
    assert.doesNotMatch(prose, /\{\{[<%]|\brelref\b|!!!\s+(?:note|warning|caution)|semanticdefects\.foundryside\.dev|\]\(\/(?!\/)/, file);
  }
});

test('every local Wardline link resolves from its final page route to a real Wardline destination', async () => {
  const routes = await wardlineRoutes();
  let checked = 0;

  for (const [file, source] of Object.entries(await pages())) {
    const stem = file.replace(/\.mdx?$/, '');
    const pageRoute = `/wardline/${stem === 'index' ? '' : `${stem}/`}`;
    for (const match of proseOutsideFences(source).matchAll(/\]\(([^)\s]+)\)/g)) {
      const target = match[1];
      if (target.startsWith('#') || /^[a-z][a-z+.-]*:/i.test(target)) continue;
      const resolved = new URL(target, `https://docs.example${pageRoute}`);
      if (!resolved.pathname.startsWith('/wardline/')) continue;
      checked += 1;
      assert.ok(routes.has(resolved.pathname), `${file}: ${target} resolves to missing ${resolved.pathname}`);
    }
  }

  assert.ok(checked >= 50, `expected a substantial Wardline link audit, checked ${checked}`);
});

test('Sydney fallback retains the source qualification that harmlessness is conditional', async () => {
  const source = (await pages())['problem-and-non-goals.mdx'];
  assert.match(source, /supplies a location default that may be harmless/);
  assert.doesNotMatch(source, /supplies a harmless location default/);
});

test('all linkable rule IDs use Rule and important state mentions use State', async () => {
  for (const [file, source] of Object.entries(await pages())) {
    const prose = proseOutsideFences(source).replace(/<Rule\s+id="(?:PY|RS)-WL-\d{3}"\s*\/>/g, '');
    assert.doesNotMatch(prose, /(?<![\w-])(?:PY|RS)-WL-\d{3}(?![\w-])/, `${file} has an unlinked rule ID`);
    assert.match(source, /import Rule from '\.\.\/\.\.\/\.\.\/components\/Rule\.astro';/, file);
  }

  for (const file of ['what-a-wardline-is.mdx', 'problem-and-non-goals.mdx', 'trust-lattice.mdx', 'declarations-and-trust-grants.mdx', 'gates-suppression-and-judge.mdx', 'residual-risks.mdx', 'roadmap-the-unbuilt.mdx', 'language-frontends.mdx', 'python-reference.mdx']) {
    assert.match((await pages())[file], /import State from '\.\.\/\.\.\/\.\.\/components\/State\.astro';[\s\S]*<State name="[A-Z_]+"\s*\/>/, file);
  }
});

test('trust lattice delegates its canonical table and diagram without dropping the analysis', async () => {
  const source = (await pages())['trust-lattice.mdx'];
  assert.match(source, /import LatticeTable from '\.\.\/\.\.\/\.\.\/components\/LatticeTable\.astro';/);
  assert.match(source, /import LatticeDiagram from '\.\.\/\.\.\/\.\.\/components\/LatticeDiagram\.astro';/);
  assert.match(source, /<LatticeTable\s*\/>/);
  assert.match(source, /<LatticeDiagram\s*\/>/);
  assert.doesNotMatch(source, /\| Rank \| State \| Set by \| Meaning \||```mermaid/);
  assert.match(source, /RAW_ZONE/);
  assert.match(source, /Why the designed join was wrong/);
  assert.match(source, /Why the trio's unreachability matters/);
});

test('generated trust lattice table has a descriptive caption and scoped column headers', async () => {
  const source = await readFile(new URL('../src/components/LatticeTable.astro', import.meta.url), 'utf8');
  assert.match(source, /<caption>Wardline trust lattice states<\/caption>/);
  assert.deepEqual(
    [...source.matchAll(/<th\s+scope="col">([^<]+)<\/th>/g)].map((match) => match[1]),
    ['Rank', 'State', 'Set by', 'Meaning'],
  );
});
