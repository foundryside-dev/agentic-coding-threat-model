import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';

import matter from 'gray-matter';

const docs = new URL('../src/content/docs/', import.meta.url);
const repository = new URL('../../', import.meta.url);

const expected = {
  appendices: {
    'index.md': ['Appendices', 1, ['./sql-extension/', './cross-model-defects/', './systems-thinking/']],
    'sql-extension.md': ['SQL Extension Case Study', 2, ['citizen programmer problem', 'authoritative data store', 'A SQL query that returns wrong results produces results', 'COALESCE()']],
    'cross-model-defects.md': ['Cross-Model Defect Chaining', 4, ['overlapping training-distribution bias', 'cross-model defect chaining', 'lineage independence', 'stale mandate execution']],
    'systems-thinking.md': ['Systems Thinking Primer', 5, ['emergent, non-adversarial', 'Reinforcing loops', 'Shifting the Burden', 'leverage points']],
  },
  assess: {
    'index.md': ['Assess Your Exposure', 1, ['./autonomy-assessment/', './ciso-assessment/', './irap-checklist/']],
    'autonomy-assessment.md': ['Agent Autonomy Self-Assessment', 1, ['not a maturity model', 'purpose is self-location', 'Level 3: Autonomous', 'boundary between levels']],
    'ciso-assessment.md': ['CISO Assessment: AI-Generated Code Risk', 2, ['category error between program state and domain state', 'cross-agency correlated risk', 'ISM-0402', 'semantic boundary enforcement']],
    'irap-checklist.md': ['IRAP Assessor Checklist', 3, ['semantic defect class specific to AI-generated code', 'contracted development pipelines', 'review processes remain effective', 'Evidence to request']],
  },
  respond: {
    'index.md': ['Controls and Actions', 1, ['./practical-guide/', './case-study/']],
    'practical-guide.md': ['Reviewing AI-Generated Code: A Practical Guide for Code Authors', 1, ['You Are Not Doing Anything Wrong', 'wrong decision about data that matters', 'Five Questions', 'high-stakes path']],
    'case-study.md': ['Case Studies: What the Invisibility Problem Looks Like in Practice', 2, ['government citizen assistance portal', '20 semantic defects', 'six months of longitudinal observation', 'standard assurance stack']],
  },
  understand: {
    'index.md': ['Governing AI-Generated Code: Semantic Risk in High-Stakes Code Paths', 1, ['structural blind spot', 'security classifications', 'policy non-application', 'not a recommendation to restrict or ban AI coding tools']],
  },
  reference: {
    'about.mdx': ['About This Project', 1, ['The document suite', 'Prepared by', 'John Morrissey', 'independent draft discussion paper']],
    'bibliography.md': ['Bibliography', 2, ['SP 800-218A', 'ASTRIDE', 'Engineering a Safer World', 'Secure AI Coding Practices']],
    'glossary.md': ['Glossary', 3, ['High-stakes code paths', 'Stale mandate execution', 'Semantic correctness', 'Governance perimeter']],
    'reading-guide.md': ['Reading Guide', 4, ['If you have 15 minutes', 'CISO', 'IRAP assessor', 'Document Suite Map']],
  },
};

const flatExpected = Object.fromEntries(Object.entries(expected).flatMap(([section, files]) =>
  Object.entries(files).map(([file, contract]) => [`${section}/${file}`, contract])));

async function safeRead(url) {
  return readFile(url, 'utf8').catch(() => '');
}

async function sectionFiles(section) {
  const entries = await readdir(new URL(`${section}/`, docs), { withFileTypes: true }).catch(() => []);
  return entries.filter((entry) => entry.isFile() && /\.mdx?$/.test(entry.name)).map((entry) => entry.name).sort();
}

async function pages() {
  return Object.fromEntries(await Promise.all(Object.keys(flatExpected).map(async (path) => [path, await safeRead(new URL(path, docs))])));
}

function proseOutsideFences(source) {
  return source.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
}

function normaliseTerm(term) {
  return term.replace(/<[^>]+>/g, '').replace(/[`*_]/g, '').replace(/\s+/g, ' ').replace(/[.:]+$/, '').trim().toLocaleLowerCase('en-AU');
}

export function extractGlossaryEntries(source) {
  const body = matter(source).content.replace(/```[\s\S]*?```/g, '');
  const entries = [];
  for (const line of body.split('\n')) {
    const table = line.match(/^\|\s*\*\*([^*]+)\*\*\s*\|\s*(.*?)\s*\|\s*$/);
    const inline = line.match(/^\*\*([^*]+)\*\*\s*(?:—|:)\s*(.+)$/);
    const heading = line.match(/^###\s+(.+?)\s*$/);
    if (table) entries.push({ term: table[1], definition: table[2] });
    else if (inline) entries.push({ term: inline[1], definition: inline[2] });
    else if (heading) entries.push({ term: heading[1], definition: '' });
  }
  return entries.map((entry) => ({ ...entry, normalised: normaliseTerm(entry.term) })).filter((entry) => entry.normalised);
}

async function contentRoutes(current = docs, prefix = '') {
  const routes = new Set();
  for (const entry of await readdir(current, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      for (const route of await contentRoutes(new URL(`${entry.name}/`, current), `${prefix}${entry.name}/`)) routes.add(route);
    } else if (/\.mdx?$/.test(entry.name)) {
      const stem = entry.name.replace(/\.mdx?$/, '');
      routes.add(`/${prefix}${stem === 'index' ? '' : `${stem}/`}`);
    }
  }
  return routes;
}

test('Task 14 creates exactly sixteen final routes with exact titles and source orders', async () => {
  assert.equal(Object.keys(flatExpected).length, 16);
  for (const [section, files] of Object.entries(expected)) {
    assert.deepEqual(await sectionFiles(section), Object.keys(files).sort(), section);
    for (const [file, [title, order]] of Object.entries(files)) {
      const source = await safeRead(new URL(`${section}/${file}`, docs));
      assert.deepEqual(matter(source).data, { title, sidebar: { order } }, `${section}/${file}`);
    }
  }
  assert.equal(await safeRead(new URL('appendices/autonomy-assessment.md', docs)), '');
  assert.equal(await safeRead(new URL('understand/paper.md', docs)), '');
  assert.equal(await safeRead(new URL('understand/taxonomy.md', docs)), '');
});

test('sourced pages retain at least four distinctive winner-or-chapter claims and fresh indexes link every child', async () => {
  for (const [path, source] of Object.entries(await pages())) {
    for (const claim of flatExpected[path][2]) assert.ok(source.includes(claim), `${path}: ${claim}`);
  }
});

test('cross-model appendix uses the current b18 cross-agency implication framing', async () => {
  const appendix = await safeRead(new URL('appendices/cross-model-defects.md', docs));

  assert.match(appendix, /states the implication for cross-agency response/);
  assert.match(appendix, /^## Implication for cross-agency response$/m);
  assert.doesNotMatch(appendix, /states the policy implication|^## Policy implication$/im);
});

test('Task 14 pages rely on the Starlight title and contain no prose-level H1', async () => {
  for (const [path, source] of Object.entries(await pages())) {
    assert.doesNotMatch(proseOutsideFences(matter(source).content), /^#\s+/m, path);
  }
});

test('fresh navigation indexes contain one introductory paragraph followed only by their child links', async () => {
  for (const section of ['appendices', 'assess', 'respond']) {
    const source = matter(await safeRead(new URL(`${section}/index.md`, docs))).content.trim();
    const blocks = source.split(/\n\s*\n/);
    assert.equal(blocks.length, 2, `${section}/index.md must be one paragraph plus one link list`);
    assert.doesNotMatch(blocks[0], /^#|^[-*]\s/m, `${section}/index.md intro must be prose`);
    const links = [...blocks[1].matchAll(/^[-*]\s+\[[^\]]+\]\(([^)]+)\)$/gm)].map((match) => match[1]);
    assert.deepEqual(links, expected[section]['index.md'][2], `${section}/index.md child links`);
  }
});

test('about renders current project metadata dynamically and owns the stable paper anchor and PDF link', async () => {
  const [about, metadataSource] = await Promise.all([
    safeRead(new URL('reference/about.mdx', docs)),
    readFile(new URL('website/src/data/site.json', repository), 'utf8'),
  ]);
  const metadata = JSON.parse(metadataSource);
  assert.match(about, /import\s+site\s+from\s+['"]\.\.\/\.\.\/\.\.\/data\/site\.json['"]/);
  for (const field of ['version', 'date', 'status']) {
    assert.match(about, new RegExp(`\\{site\\.${field}\\}`), field);
    assert.ok(!matter(about).content.includes(metadata[field]), `${field} must not be hard-coded`);
  }
  assert.doesNotMatch(about, /site\.classification|\| \*\*Classification\*\*/);
  assert.equal(Object.hasOwn(metadata, 'classification'), false);
  assert.match(about, /^## The paper\s*$/m);
  assert.match(about, /\.\.\/\.\.\/pdf\/threat-model-discussion-paper-community\.pdf/);
  assert.doesNotMatch(about, /understand\/paper/);
});

test('merged glossary is the exact normalised union with one non-empty definition per term', async () => {
  const sourceUrls = [
    new URL('docs/reference/glossary.md', repository),
    new URL('reference-site/content/appendices/glossary.md', repository),
    new URL('source/chapters/sdag-21-appendix-h-glossary.md', repository),
  ];
  const sources = await Promise.all(sourceUrls.map((url) => readFile(url, 'utf8')));
  const expectedTerms = new Set(sources.flatMap(extractGlossaryEntries).map((entry) => entry.normalised));
  const destination = extractGlossaryEntries(await safeRead(new URL('reference/glossary.md', docs)));
  const actualTerms = destination.map((entry) => entry.normalised);

  assert.ok(expectedTerms.size >= 60, `extractor found only ${expectedTerms.size} source terms`);
  assert.equal(new Set(actualTerms).size, actualTerms.length, 'duplicate normalised destination term');
  assert.deepEqual(new Set(actualTerms), expectedTerms);
  for (const entry of destination) assert.ok(entry.definition.trim().length >= 8, `${entry.term}: missing or empty definition`);
});

test('reading guide merges both source guides rather than dropping the suite-map routes', async () => {
  const guide = await safeRead(new URL('reference/reading-guide.md', docs));
  for (const claim of ['Start here', 'What to read next', 'CISO', 'Developer / code author', '12 roles', 'Wardline companion']) {
    assert.ok(guide.includes(claim), claim);
  }
});

test('bibliography preserves the complete declared winner, including all Wardline records and notices', async () => {
  const [destination, winner] = await Promise.all([
    safeRead(new URL('reference/bibliography.md', docs)),
    readFile(new URL('docs/reference/bibliography.md', repository), 'utf8'),
  ]);
  const winnerBody = matter(winner).content.trimStart().replace(/^# Bibliography\s*\n+/, '').trim();
  assert.equal(matter(destination).content.trim(), winnerBody);
  assert.equal((destination.match(/Morrissey, J\. \*Wardline/g) ?? []).length, 3);
  assert.match(destination, /Comments and contributions are welcome/);
  assert.match(destination, /\*\*Suggested citation:\*\*/);
});

test('reading-guide merge retains suite framing and the omitted role-specific routes', async () => {
  const guide = await safeRead(new URL('reference/reading-guide.md', docs));
  for (const claim of [
    'AI coding tools are in active use across organisations and their contracted suppliers',
    'does not recommend restricting them',
    'a silently defaulted security classification',
    'a swallowed audit record',
    'an unvalidated external authority claim treated as trusted',
    'measured defect data from a real project',
  ]) assert.ok(guide.includes(claim), claim);

  assert.match(guide, /#### Programme director[\s\S]*?\[§1\.2\.6\]\(\.\.\/\.\.\/pdf\/threat-model-discussion-paper-community\.pdf#126-legacy-modernisation-risk\)/);
  assert.match(guide, /#### Development team lead[\s\S]*?\[§7\.2\]\(\.\.\/\.\.\/pdf\/threat-model-discussion-paper-community\.pdf#72-technical-controls-what-is-buildable\)[\s\S]*?\[Wardline companion\]\(\.\.\/\.\.\/wardline\/\)[\s\S]*?\[Python reference\]\(\.\.\/\.\.\/wardline\/python-reference\/\)/);
  assert.match(guide, /#### Tool implementer \/ architect[\s\S]*?\*\*30-minute path:\*\*[\s\S]*?\[Wardline companion\]\(\.\.\/\.\.\/wardline\/\)/);
});

test('reading guide opens with one concise orientation followed by start-here', async () => {
  const guide = matter(await safeRead(new URL('reference/reading-guide.md', docs))).content;
  const preamble = guide.split(/\n---\n/, 1)[0].trim();
  const blocks = preamble.split(/\n\s*\n/);

  assert.equal(blocks.length, 2, 'preamble must be one orientation paragraph plus one start-here paragraph');
  for (const claim of [
    'AI coding tools are in active use across organisations and their contracted suppliers',
    'productive and increasingly standard',
    'does not recommend restricting them',
    'syntactically correct',
    'a silently defaulted security classification',
    'a swallowed audit record',
    'an unvalidated external authority claim treated as trusted',
    'measured defect data from a real project',
    'classifies the failure modes using a STRIDE-based taxonomy',
    'assesses gaps in current guidance, including the ISM and Essential Eight',
    'one argument at different depths',
    '12 roles',
    'you do not need to read the whole suite',
  ]) assert.ok(blocks[0].includes(claim), claim);
  assert.match(blocks[1], /^\*\*Start here:\*\*/);
  assert.match(blocks[1], /What to read next/);
});

test('About retains declared depth and scope while using twelve-role current framing', async () => {
  const about = await safeRead(new URL('reference/about.mdx', docs));
  assert.match(about, /12 roles/);
  assert.doesNotMatch(about, /Nine roles|nine roles/);
  for (const cue of ['(~13 pp)', '(~23 pp)', '(~200 pp)', '(Parts I–II, ~86 pp)']) assert.ok(about.includes(cue), cue);
  for (const claim of [
    '15 core entries, 5 provisional', 'annotated agent transcript',
    'trust lattice', 'boundary declarations and caller-granted trust', 'rule catalogue and tier-modulated severity',
    'gate/suppression/judge semantics', 'Python practitioner reference',
  ]) assert.ok(about.includes(claim), claim);
});

test('conversion keeps Australian English and leaves no legacy syntax, tags, snippets, icons, or buttons', async () => {
  for (const [path, source] of Object.entries(await pages())) {
    const prose = proseOutsideFences(source);
    assert.doesNotMatch(prose, /\{\{[<%]|\brelref\b|!!!\s+\w+|semanticdefects\.foundryside\.dev|\]\(\/(?!\/)|--8<--|\.md-button|:material-[\w-]+:|^tags:/m, path);
    if (path !== 'reference/bibliography.md') {
      assert.doesNotMatch(prose, /\b(?:organizations?|behavior|analyz(?:e|ed|es|ing)|authorization|modeling|catalog)\b/i, `${path}: use Australian English`);
    }
  }
});

test('all local links resolve from final routes against the complete planned site and PDF destinations', async () => {
  const routes = await contentRoutes();
  for (const path of Object.keys(flatExpected)) {
    const stem = path.replace(/\.mdx?$/, '');
    routes.add(`/${stem.endsWith('/index') ? stem.slice(0, -5) : `${stem}/`}`.replace(/\/+/g, '/'));
  }
  for (const pdf of ['governing-ai-generated-code.pdf', 'reviewing-ai-generated-code.pdf', 'threat-model-discussion-paper-community.pdf', 'wardline-companion-community.pdf', 'document-suite-map.pdf']) {
    routes.add(`/pdf/${pdf}`);
  }

  let checked = 0;
  for (const [path, source] of Object.entries(await pages())) {
    const stem = path.replace(/\.mdx?$/, '');
    const pageRoute = `/${stem.endsWith('/index') ? stem.slice(0, -5) : `${stem}/`}`.replace(/\/+/g, '/');
    for (const match of proseOutsideFences(source).matchAll(/\]\(([^)\s]+)\)/g)) {
      const target = match[1];
      if (target.startsWith('#') || /^[a-z][a-z+.-]*:/i.test(target)) continue;
      assert.ok(!target.startsWith('/'), `${path}: ${target} must be content-relative`);
      assert.ok(!(path.split('/')[1] !== 'index.md' && target.startsWith('./')), `${path}: ${target} risks sibling nesting`);
      const resolved = new URL(target, `https://docs.example${pageRoute}`);
      const previewResolved = new URL(target, `https://docs.example/preview${pageRoute}`);
      checked += 1;
      assert.ok(routes.has(resolved.pathname), `${path}: ${target} resolves to missing ${resolved.pathname}`);
      assert.ok(previewResolved.pathname.startsWith('/preview/'), `${path}: ${target} escapes the /preview/ base to ${previewResolved.pathname}`);
      assert.ok(routes.has(previewResolved.pathname.slice('/preview'.length)), `${path}: ${target} resolves under preview to missing ${previewResolved.pathname}`);
    }
  }
  assert.ok(checked >= 75, `expected substantial final-route audit, checked ${checked}`);
});
