import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';

import matter from 'gray-matter';

const docs = new URL('../src/content/docs/', import.meta.url);
const directory = new URL('threat-model/', docs);

const expected = {
  'index.md': ['Threat Model', 1, [
    'This section presents the threat model for agent-generated code',
    './introduction/', './threat-landscape/', './trust-boundaries/',
  ]],
  'introduction.md': ['Introduction and Scope', 1, [
    'high-stakes code paths',
    'The perimeter of software production is expanding',
    'discussion paper presented for refinement',
    'pure-Python static analyser, published on PyPI',
  ]],
  'threat-landscape.md': ['The Threat Landscape', 2, [
    'category error between program state and domain state',
    'Every invocation is the first day on the job',
    'context-bounded generation from biased priors',
    'Why training data is a major part of the story',
  ]],
  'trust-boundaries.md': ['Trust Boundaries', 3, [
    'serialisation boundaries reset trust',
    'bidirectional authority collapse',
    'does not change the epistemic status of the output',
    'The appropriate analogy is not "code written by a trusted senior engineer"',
  ]],
  'review-problem.md': ['The Review Problem', 4, [
    'human review process is structurally inadequate',
    'automation bias',
    'check differently',
    'cryptographic signature the agent does not hold',
  ]],
  'guidance-gap.md': ['The Guidance Gap', 6, [
    'securing AI',
    'securing what AI builds',
    'thirteen are undetected or only partially detected',
    'Correlated failure risk models',
  ]],
  'response-landscape.md': ['The Response Landscape', 7, [
    'a weak but visible validation boundary is often safer',
    'Verification-first framing',
    'byte-identity corpus',
    'repository cannot self-authorise its own trust story',
  ]],
  'open-questions.md': ['Open Questions', 8, [
    'lineage independence',
    'This interaction mechanism has not been empirically demonstrated',
    'independently produce the implementation',
    'SQL also uniquely bypasses the validation boundary',
  ]],
};

async function pages() {
  return Object.fromEntries(await Promise.all(Object.keys(expected).map(async (file) => [
    file,
    await readFile(new URL(file, directory), 'utf8').catch(() => ''),
  ])));
}

function proseOutsideFences(source) {
  return source.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
}

function mermaidBlocks(source) {
  return [...source.matchAll(/```mermaid\n([\s\S]*?)\n```/g)].map((match) => match[1]);
}

function withoutExplicitTextColour(diagram) {
  return diagram.replace(/(style\s+(?:GEN|VB|REPO)\s+[^\n]*),color:#[0-9a-f]{3,6}$/gim, '$1');
}

function rgb(hex) {
  const digits = hex.slice(1);
  const expanded = digits.length === 3 ? [...digits].map((digit) => digit.repeat(2)).join('') : digits;
  assert.match(expanded, /^[0-9a-f]{6}$/i, `invalid colour ${hex}`);
  return [0, 2, 4].map((offset) => Number.parseInt(expanded.slice(offset, offset + 2), 16) / 255);
}

function luminance(hex) {
  const linear = rgb(hex).map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(first, second) {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
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

const plannedFutureRoutes = new Set([
  '/appendices/', '/appendices/sql-extension/', '/appendices/cross-model-defects/', '/appendices/systems-thinking/',
  '/assess/', '/assess/autonomy-assessment/', '/assess/ciso-assessment/', '/assess/irap-checklist/',
  '/respond/', '/respond/practical-guide/', '/respond/case-study/',
  '/understand/',
  '/reference/about/', '/reference/bibliography/', '/reference/glossary/', '/reference/reading-guide/',
]);

test('threat-model section has the exact eight top-level pages, titles, and source orders', async () => {
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

test('every page preserves at least four distinctive current source-governed claims', async () => {
  for (const [file, source] of Object.entries(await pages())) {
    for (const claim of expected[file][2]) assert.ok(source.includes(claim), `${file}: ${claim}`);
  }
});

test('v0.3 corrections replace the stale companion-specification and training-data claims', async () => {
  const migrated = await pages();
  const introduction = migrated['introduction.md'];
  assert.match(introduction, /Wardline: An As-Built Specification[\s\S]*as-built specification of a shipped reference implementation/);
  assert.match(introduction, /original pre-implementation design \(v0\.2\.0, archived\)[\s\S]*proposed considerably more than was built/);
  assert.match(introduction, /feasibility claim rests on the case study project's bespoke enforcement, operational since January 2026/);

  const threat = migrated['threat-landscape.md'];
  assert.match(threat, /persistent memory stores, project-rule files, larger context windows, and checkpointing features/);
  assert.match(threat, /training-distribution bias[\s\S]*untouched by session-level memory/);
  assert.match(threat, /four coding postures[\s\S]*offensive[\s\S]*confident[\s\S]*guarded[\s\S]*sceptical/);
  assert.doesNotMatch(threat, /companion specification formalises these as four coding postures/);
});

test('current b18 chapter semantics replace superseded policy framing', async () => {
  const migrated = await pages();

  assert.match(migrated['threat-landscape.md'], /whose implication is clear: the assumption that "different agencies use different models, so we are safe"/);
  assert.doesNotMatch(migrated['threat-landscape.md'], /whose policy implication is clear/);

  assert.match(migrated['review-problem.md'], /develops this response across process, technical, and framework-level controls/);
  assert.doesNotMatch(migrated['review-problem.md'], /develops this response across process, technical, and policy controls/);

  assert.match(migrated['guidance-gap.md'], /Only bodies with the institutional mandate and cross-government visibility to develop controls of this kind are positioned to close them\./);
  assert.doesNotMatch(migrated['guidance-gap.md'], /Closing them is work for/);

  const response = migrated['response-landscape.md'];
  assert.match(response, /\[framework-level controls\]\(#framework-level-controls-what-does-not-yet-exist\)/);
  assert.match(response, /governance readers on the framework-level controls/);
  assert.match(response, /^## Framework-level controls \(what does not yet exist\)$/m);
  assert.match(response, /The controls below describe what does not yet exist at the framework level/);
  assert.match(response, /This is the framework-level response to the governance perimeter problem/);
  assert.doesNotMatch(response, /policy controls|policy readers/i);

  const questions = migrated['open-questions.md'];
  assert.match(questions, /the implication stands: model diversity strategies require analysis of \*lineage independence\*/);
  assert.match(questions, /the implication from the \[cross-model defects analysis\]/);
  assert.match(questions, /would make that implication actionable/);
  assert.match(questions, /agencies would need to address agentic code risks/);
  assert.doesNotMatch(questions, /policy implication|organisations must address agentic code risks/i);

  assert.match(migrated['index.md'], /process, technical, and framework-level controls, including semantic enforcement/);
  assert.doesNotMatch(migrated['index.md'], /process, technical, and policy controls/);
});

test('designed Wardline claims link to the design account without laundering them through the as-built label', async () => {
  const migrated = await pages();
  const response = migrated['response-landscape.md'];
  const questions = migrated['open-questions.md'];

  for (const [file, source] of Object.entries({ 'response-landscape.md': response, 'open-questions.md': questions })) {
    assert.doesNotMatch(source, /designed \[Wardline as-built specification\]/, file);
  }

  assert.match(response, /\[original Wardline design\]\(\.\.\/\.\.\/wardline\/roadmap-the-unbuilt\/\) answered this procedurally/);
  assert.match(response, /\[designed Wardline specification\]\(\.\.\/\.\.\/wardline\/roadmap-the-unbuilt\/\) placed the corpus behind CODEOWNERS-style review/);
  assert.match(questions, /\[original Wardline design\]\(\.\.\/\.\.\/wardline\/roadmap-the-unbuilt\/\) proposed one structural answer/);
  assert.match(response, /The \[as-built specification\]\(\.\.\/\.\.\/wardline\/gates-suppression-and-judge\/\) takes a deliberate "No governance" position/);
  assert.match(questions, /its \[as-built successor\]\(\.\.\/\.\.\/wardline\/verification\/\) acknowledges that neither was built/);
});

test('conversion leaves no Hugo, MkDocs, same-origin, root-relative, or US-English residue', async () => {
  for (const [file, source] of Object.entries(await pages())) {
    const prose = proseOutsideFences(source);
    assert.doesNotMatch(prose, /\{\{[<%]|\brelref\b|!!!\s+(?:note|warning|caution)|semanticdefects\.foundryside\.dev|\]\(\/(?!\/)/, file);
    assert.doesNotMatch(prose, /\b(?:organizations?|behavior|analyz(?:e|ed|es|ing)|authorization|modeling|catalog)\b/i, `${file}: use Australian English`);
  }
});

test('all content-relative links resolve from final routes and cannot accidentally nest siblings', async () => {
  const routes = await contentRoutes();
  for (const route of plannedFutureRoutes) routes.add(route);
  let checked = 0;

  for (const [file, source] of Object.entries(await pages())) {
    const stem = file.replace(/\.mdx?$/, '');
    const pageRoute = `/threat-model/${stem === 'index' ? '' : `${stem}/`}`;
    for (const match of proseOutsideFences(source).matchAll(/\]\(([^)\s]+)\)/g)) {
      const target = match[1];
      if (target.startsWith('#') || /^[a-z][a-z+.-]*:/i.test(target)) continue;
      assert.ok(!target.startsWith('/'), `${file}: ${target} must be content-relative`);
      const resolved = new URL(target, `https://docs.example${pageRoute}`);
      checked += 1;
      assert.ok(routes.has(resolved.pathname), `${file}: ${target} resolves to missing ${resolved.pathname}`);
    }
  }

  assert.ok(checked >= 35, `expected a substantial final-route link audit, checked ${checked}`);
});

test('diagram ownership stays split between canonical STRIDE DFD and Task13 validation boundary', async () => {
  const [stride, strideChapter, trust, trustChapter, otherPages] = await Promise.all([
    readFile(new URL('stride/index.mdx', directory), 'utf8'),
    readFile(new URL('../../source/chapters/sdag-06-stride.md', import.meta.url), 'utf8'),
    readFile(new URL('trust-boundaries.md', directory), 'utf8').catch(() => ''),
    readFile(new URL('../../source/chapters/sdag-08-trust-boundary.md', import.meta.url), 'utf8'),
    pages(),
  ]);

  assert.deepEqual(mermaidBlocks(stride), mermaidBlocks(strideChapter), 'Task10 owns the canonical sdag-06 DFD');
  assert.deepEqual(mermaidBlocks(trust).map(withoutExplicitTextColour), mermaidBlocks(trustChapter), 'Task13 owns the sdag-08 validation-boundary diagram plus accessibility-only text colour');
  assert.equal(mermaidBlocks(stride).length, 1);
  assert.equal(mermaidBlocks(trust).length, 1);

  const description = trustChapter.match(/\*\*Diagram description \(accessibility\):\*\*[^\n]+/)?.[0];
  assert.ok(description);
  assert.ok(trust.includes(description), 'trust-boundaries.md keeps the exact adjacent accessibility description');
  assert.match(trust, /```mermaid[\s\S]*?```\n\n\*\*Diagram description \(accessibility\):\*\*/);

  for (const [file, source] of Object.entries(otherPages)) {
    if (file !== 'trust-boundaries.md') assert.equal(mermaidBlocks(source).length, 0, `${file} must not duplicate either diagram`);
  }
});

test('validation-boundary Mermaid uses explicit WCAG AA text contrast on every pale node fill', async () => {
  const trust = await readFile(new URL('trust-boundaries.md', directory), 'utf8');
  const [diagram] = mermaidBlocks(trust);
  const styles = Object.fromEntries([...diagram.matchAll(/^\s*style\s+(GEN|VB|REPO)\s+([^\n]+)$/gm)].map((match) => [
    match[1],
    Object.fromEntries(match[2].split(',').map((declaration) => declaration.split(':', 2))),
  ]));

  assert.deepEqual(Object.keys(styles).sort(), ['GEN', 'REPO', 'VB']);
  for (const [node, style] of Object.entries(styles)) {
    assert.equal(style.color, '#111', `${node}: explicit dark text colour`);
    const ratio = contrast(style.color, style.fill);
    assert.ok(ratio >= 4.5, `${node}: ${style.color} on ${style.fill} contrast ${ratio.toFixed(2)} is below WCAG AA 4.5`);
  }
});

test('the existing Task10 STRIDE page inventory is preserved without top-level duplicates', async () => {
  const strideDirectory = new URL('stride/', directory);
  const files = (await readdir(strideDirectory)).sort();
  assert.deepEqual(files, [
    'denial-of-service.mdx', 'elevation-of-privilege.mdx', 'index.mdx',
    'information-disclosure.mdx', 'repudiation.mdx', 'spoofing.mdx', 'tampering.mdx',
  ]);
  assert.equal(Object.keys(expected).some((file) => file.startsWith('stride/')), false);
});
