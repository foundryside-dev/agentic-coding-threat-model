import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

const website = new URL('../', import.meta.url);
const repository = new URL('../../', import.meta.url);

async function source(path) {
	return readFile(new URL(path, website), 'utf8');
}

test('landing is a Starlight splash page with dynamic publication data and complete routes', async () => {
	const landing = await source('src/content/docs/index.mdx');
	assert.match(landing, /template:\s*splash/);
	assert.match(landing, /import\s+site\s+from\s+['"]\.\.\/\.\.\/data\/site\.json['"]/);
	assert.match(landing, /import\s+\{\s*CardGrid,\s*LinkCard\s*\}\s+from\s+['"]@astrojs\/starlight\/components['"]/);
	for (const field of ['version', 'status', 'date']) {
		assert.match(landing, new RegExp(`\\{site\\.${field}\\}`), field);
	}
	assert.doesNotMatch(landing, /site\.classification|\bOFFICIAL\b/);
	const site = JSON.parse(await source('src/data/site.json'));
	assert.equal(Object.hasOwn(site, 'classification'), false);
	for (const route of ['./understand/', './assess/', './respond/practical-guide/', './assess/ciso-assessment/', './assess/irap-checklist/', './acf/', './wardline/', './reference/reading-guide/']) {
		assert.ok(landing.includes(route), route);
	}
	for (const pdf of ['document-suite-map.pdf', 'governing-ai-generated-code.pdf', 'reviewing-ai-generated-code.pdf', 'threat-model-discussion-paper-community.pdf', 'wardline-companion-community.pdf']) {
		assert.ok(landing.includes(`./pdf/${pdf}`), pdf);
	}
	assert.match(landing, /AI coding tools are in active use/);
	assert.match(landing, /does not recommend restricting them/);
});

test('public PDF set is exactly the source PDF set, byte for byte', async () => {
	const sourceDir = new URL('docs/pdf/', repository);
	const publicDir = new URL('public/pdf/', website);
	const expected = (await readdir(sourceDir)).filter((name) => name.endsWith('.pdf')).sort();
	const actual = (await readdir(publicDir)).filter((name) => name.endsWith('.pdf')).sort();
	assert.equal(expected.length, 5);
	assert.deepEqual(actual, expected);
	for (const name of expected) {
		assert.deepEqual(await readFile(new URL(name, publicDir)), await readFile(new URL(name, sourceDir)), name);
	}
});

test('plugin and complete generated-output link validator are wired into both builds', async () => {
	const packageJson = JSON.parse(await source('package.json'));
	assert.equal(packageJson.dependencies['starlight-links-validator'], '0.25.2');
	assert.equal(packageJson.devDependencies['@playwright/test'], '1.62.1');
	assert.equal(packageJson.devDependencies['@axe-core/playwright'], '4.12.1');
	assert.equal(packageJson.scripts['test:e2e'], 'playwright test');
	assert.equal(packageJson.scripts['test:built-links'], 'node --test tests/check-built-links.test.mjs');
	assert.match(packageJson.scripts.build, /check-built-links\.mjs --base=\//);
	assert.match(packageJson.scripts['build:preview'], /check-built-links\.mjs --base=\/preview\//);

	const config = await source('astro.config.mjs');
	assert.match(config, /import starlightLinksValidator from ['"]starlight-links-validator['"]/);
	assert.match(config, /plugins:\s*\[starlightLinksValidator\(\{\s*errorOnRelativeLinks:\s*false\s*\}\)\]/);
	const validator = await source('scripts/check-built-links.mjs');
	assert.match(validator, /missing-target/);
	assert.match(validator, /missing-fragment/);
	assert.match(validator, /base-escape/);
});

test('Playwright harness enforces base-safe navigation and all acceptance groups', async () => {
	await access(new URL('playwright.config.ts', website));
	const [config, spec] = await Promise.all([source('playwright.config.ts'), source('tests/site.spec.ts')]);
	assert.match(config, /PLAYWRIGHT_BASE_URL/);
	assert.match(config, /ASTRO_PREVIEW_BACKGROUND=0 npm run preview -- --host 127\.0\.0\.1/);
	assert.match(config, /390/);
	assert.match(config, /844/);
	assert.match(config, /forbidOnly:\s*!!process\.env\.CI/);
	assert.match(config, /failOnFlakyTests:\s*!!process\.env\.CI/);
	assert.match(config, /screenshot:\s*['"]only-on-failure['"]/);
	assert.match(config, /trace:\s*['"]retain-on-failure['"]/);
	assert.doesNotMatch(spec, /page\.goto\(\s*['"]\//);
	assert.match(spec, /function\s+routeUrl\s*\(/);
	assert.match(spec, /pathname\.startsWith/);
	assert.match(spec, /site\.json/);
	assert.match(spec, /readFileSync\s*\(/);
	assert.doesNotMatch(spec, /import\s+site\s+from\s+['"][^'"]*site\.json['"]/);
	assert.match(spec, /function\s+stabilizeMermaid\s*\(/);
	assert.match(spec, /document\.fonts\.ready/);
	assert.doesNotMatch(spec, /OFFICIAL · v0\.3\.0 · Draft for Comment · 9 August 2026/);
	for (const marker of [
		'landing page publication metadata and all five PDF responses',
		'critical-risk filter',
		'ACF-T1 and PY-WL-101 cross-link',
		'lattice table and Mermaid diagram',
		'search finds required terms',
		'WCAG 2A and 2AA',
		'JavaScript-disabled Mermaid prose',
		'no horizontal overflow',
		'deterministic acceptance evidence',
	]) assert.ok(spec.includes(marker), marker);
});

test('workflow installs Chromium, runs root E2E, then preview build, and always uploads evidence', async () => {
	const workflow = await readFile(new URL('.github/workflows/deploy.yml', repository), 'utf8');
	const install = workflow.indexOf('npx playwright install --with-deps chromium');
	const rootBuild = workflow.indexOf('npm run build\n');
	const e2e = workflow.indexOf('npm run test:e2e');
	const preview = workflow.indexOf('npm run build:preview');
	assert.ok(install > 0 && rootBuild > install && e2e > rootBuild && preview > e2e);
	assert.match(workflow, /if:\s*always\(\)/);
	assert.match(workflow, /actions\/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02/);
	assert.match(workflow, /website\/playwright-report\//);
	assert.match(workflow, /website\/test-results\//);
	assert.match(workflow, /retention-days:\s*14/);
});
