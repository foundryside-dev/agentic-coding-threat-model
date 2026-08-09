import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const site = JSON.parse(readFileSync(new URL('../src/data/site.json', import.meta.url), 'utf8')) as {
	classification: string;
	date: string;
	status: string;
	version: string;
};

const baseUrl = new URL(process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4321/');
if (!baseUrl.href.endsWith('/')) throw new Error('PLAYWRIGHT_BASE_URL must end in "/"');

/** Resolve every route beneath the configured deployment base. */
function routeUrl(route = '') {
	return new URL(route.replace(/^\/+/, ''), baseUrl);
}

function expectUnderBase(url: string) {
	const finalUrl = new URL(url);
	expect(finalUrl.origin).toBe(baseUrl.origin);
	expect(finalUrl.pathname.startsWith(baseUrl.pathname)).toBe(true);
}

async function navigate(page: Page, route = '') {
	const response = await page.goto(routeUrl(route).href);
	expect(response, `No response for ${route}`).not.toBeNull();
	expect(response?.ok(), `${response?.status()} ${route}`).toBe(true);
	expectUnderBase(page.url());
	return response;
}

async function renderedMermaidMarkup(page: Page) {
	return page.locator('pre.mermaid svg').evaluateAll((svgs) => svgs.map((svg) => svg.outerHTML));
}

async function stabilizeMermaid(page: Page, previousMarkup?: string[]) {
	const diagrams = page.locator('pre.mermaid');
	const diagramCount = await diagrams.count();
	if (diagramCount > 0) {
		const svgs = diagrams.locator('svg');
		await expect(svgs).toHaveCount(diagramCount, { timeout: 15_000 });
		for (let index = 0; index < diagramCount; index += 1) await expect(svgs.nth(index)).toBeVisible();
		if (previousMarkup?.length) {
			await expect.poll(() => renderedMermaidMarkup(page), { timeout: 15_000 }).not.toEqual(previousMarkup);
		}
	}
	await page.evaluate(async () => { await document.fonts.ready; });
}

async function setTheme(page: Page, theme: 'light' | 'dark') {
	const currentTheme = await page.locator('html').getAttribute('data-theme');
	const previousMarkup = currentTheme === theme ? undefined : await renderedMermaidMarkup(page);
	await page.evaluate((value) => {
		document.documentElement.dataset.theme = value;
		localStorage.setItem('starlight-theme', value);
	}, theme);
	await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
	await stabilizeMermaid(page, previousMarkup);
}

test('landing page publication metadata and all five PDF responses', async ({ page }) => {
	await navigate(page);
	const publicationLine = `${site.classification} · v${site.version} · ${site.status} · ${site.date}`;
	await expect(page.getByText(publicationLine)).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Start here' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Find your path' })).toBeVisible();

	for (const filename of [
		'document-suite-map.pdf',
		'governing-ai-generated-code.pdf',
		'reviewing-ai-generated-code.pdf',
		'threat-model-discussion-paper-community.pdf',
		'wardline-companion-community.pdf',
	]) {
		const response = await page.request.get(routeUrl(`pdf/${filename}`).href);
		expect(response.ok(), `${filename}: ${response.status()}`).toBe(true);
		expect(response.headers()['content-type']).toContain('application/pdf');
		expectUnderBase(response.url());
	}
});

test('critical-risk filter leaves exactly ACF-T1 and ACF-E1 visible and is keyboard-operable', async ({ page }, testInfo) => {
	test.skip(testInfo.project.name === 'chromium-mobile', 'The mobile project has a dedicated overflow gate.');
	await navigate(page, 'acf/');
	const risk = page.getByLabel('Risk');
	await risk.focus();
	await page.keyboard.press('Home');
	await page.keyboard.press('ArrowDown');
	await page.keyboard.press('Enter');
	await expect(risk).toBeFocused();
	await expect(risk).toHaveValue('critical');
	const visibleRows = page.locator('[data-acf-entry]:visible');
	await expect(visibleRows).toHaveCount(2);
	await expect(visibleRows).toContainText(['ACF-E1', 'ACF-T1']);
});

test('ACF-T1 and PY-WL-101 cross-link in both directions', async ({ page }, testInfo) => {
	test.skip(testInfo.project.name === 'chromium-mobile', 'The mobile project has a dedicated overflow gate.');
	await navigate(page, 'acf/t1-authority-tier-conflation/');
	const ruleLink = page.locator('.acf-infobox').getByRole('link', { name: 'PY-WL-101', exact: true });
	await expect(ruleLink).toHaveAttribute('href', routeUrl('wardline/rules/boundary-rules/#py-wl-101').pathname + '#py-wl-101');

	await navigate(page, 'wardline/rules/boundary-rules/#py-wl-101');
	const acfLink = page.locator('tr#py-wl-101').getByRole('link', { name: 'ACF-T1', exact: true });
	await expect(acfLink).toHaveAttribute('href', routeUrl('acf/t1-authority-tier-conflation/').pathname);
});

test('lattice table and Mermaid diagram expose eight states and rerender on data-theme changes without errors', async ({ page }, testInfo) => {
	test.skip(testInfo.project.name === 'chromium-mobile', 'The mobile project has a dedicated overflow gate.');
	const errors: string[] = [];
	page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
	page.on('pageerror', (error) => errors.push(error.message));
	await navigate(page, 'wardline/trust-lattice/');
	const states = ['INTEGRAL', 'ASSURED', 'GUARDED', 'UNKNOWN_ASSURED', 'UNKNOWN_GUARDED', 'EXTERNAL_RAW', 'UNKNOWN_RAW', 'MIXED_RAW'];
	await expect(page.locator('table[aria-label="Wardline trust lattice states"] tbody tr, table:has(caption:text("Wardline trust lattice states")) tbody tr')).toHaveCount(8);
	const table = page.locator('table').filter({ hasText: 'Wardline trust lattice states' });
	for (const state of states) await expect(table).toContainText(state);
	const mermaid = page.locator('pre.mermaid');
	await stabilizeMermaid(page);
	for (const state of states) await expect(mermaid.locator('svg')).toContainText(state);
	const before = await mermaid.locator('svg').evaluate((svg) => svg.outerHTML);
	const current = await page.locator('html').getAttribute('data-theme');
	await setTheme(page, current === 'dark' ? 'light' : 'dark');
	const after = await mermaid.locator('svg').evaluate((svg) => svg.outerHTML);
	expect(after).not.toBe(before);
	for (const state of states) await expect(mermaid.locator('svg')).toContainText(state);
	expect(errors).toEqual([]);
});

test('search finds required terms: Fabricated Default, PY-WL-111, and trust lattice', async ({ page }, testInfo) => {
	test.skip(testInfo.project.name === 'chromium-mobile', 'The mobile project has a dedicated overflow gate.');
	for (const term of ['Fabricated Default', 'PY-WL-111', 'trust lattice']) {
		await navigate(page);
		await page.locator('button[data-open-modal]').click();
		const input = page.locator('.pagefind-ui__search-input');
		await expect(input).toBeVisible();
		await input.fill(term);
		await expect(page.locator('.pagefind-ui__results')).toContainText(term, { timeout: 15_000, ignoreCase: true });
	}
});

test('key pages pass WCAG 2A and 2AA in light and dark themes', async ({ page }, testInfo) => {
	test.skip(testInfo.project.name === 'chromium-mobile', 'The mobile project has a dedicated overflow gate.');
	for (const route of ['', 'acf/', 'acf/t1-authority-tier-conflation/', 'wardline/trust-lattice/', 'threat-model/stride/']) {
		for (const theme of ['light', 'dark'] as const) {
			await navigate(page, route);
			await setTheme(page, theme);
			await stabilizeMermaid(page);
			const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
			expect(results.violations, `${route || 'landing'} (${theme})`).toEqual([]);
		}
	}
});

test('JavaScript-disabled Mermaid prose remains adjacent to every diagram', async ({ browser }, testInfo) => {
	test.skip(testInfo.project.name === 'chromium-mobile', 'The mobile project has a dedicated overflow gate.');
	const context = await browser.newContext({ javaScriptEnabled: false });
	const page = await context.newPage();
	for (const route of ['appendices/systems-thinking/', 'threat-model/stride/', 'threat-model/trust-boundaries/', 'wardline/trust-lattice/']) {
		await navigate(page, route);
		const diagrams = page.locator('pre.mermaid');
		expect(await diagrams.count(), route).toBeGreaterThan(0);
		for (let index = 0; index < await diagrams.count(); index += 1) {
			const adjacentProse = await diagrams.nth(index).evaluate((node) => {
				const before = node.previousElementSibling?.textContent?.trim() ?? '';
				const after = node.nextElementSibling?.textContent?.trim() ?? '';
				return `${before} ${after}`.trim();
			});
			expect(adjacentProse.length, `${route} diagram ${index + 1}`).toBeGreaterThan(20);
		}
	}
	await context.close();
});

test('landing, ACF registry, and lattice pages have no horizontal overflow at 390×844', async ({ page }, testInfo) => {
	test.skip(testInfo.project.name !== 'chromium-mobile', 'This gate runs at the exact mobile viewport.');
	for (const route of ['', 'acf/', 'wardline/trust-lattice/']) {
		await navigate(page, route);
		await stabilizeMermaid(page);
		const dimensions = await page.evaluate(() => ({
			clientWidth: document.documentElement.clientWidth,
			scrollWidth: document.documentElement.scrollWidth,
		}));
		expect(dimensions.scrollWidth, `${route || 'landing'} overflow`).toBeLessThanOrEqual(dimensions.clientWidth);
	}
});

test('deterministic acceptance evidence captures five views in both themes', async ({ page }, testInfo) => {
	test.skip(testInfo.project.name === 'chromium-mobile', 'Evidence uses the deterministic desktop viewport.');
	const evidenceDir = path.resolve('test-results/evidence');
	await mkdir(evidenceDir, { recursive: true });
	const views = [
		{ name: 'landing', route: '' },
		{ name: 'acf-t1-infobox', route: 'acf/t1-authority-tier-conflation/', locator: '.acf-infobox' },
		{ name: 'acf-critical-filter', route: 'acf/', filter: true },
		{ name: 'lattice', route: 'wardline/trust-lattice/', locator: 'main' },
		{ name: 'stride', route: 'threat-model/stride/', locator: 'main' },
	] as const;
	for (const theme of ['light', 'dark'] as const) {
		for (const view of views) {
			await navigate(page, view.route);
			await setTheme(page, theme);
			await stabilizeMermaid(page);
			if ('filter' in view) {
				await page.getByLabel('Risk').selectOption('critical');
				await expect(page.locator('[data-acf-entry]:visible')).toHaveCount(2);
			}
			const target = 'locator' in view ? page.locator(view.locator) : page;
			await target.screenshot({ path: path.join(evidenceDir, `${view.name}-${theme}.png`), animations: 'disabled' });
		}
	}
});
