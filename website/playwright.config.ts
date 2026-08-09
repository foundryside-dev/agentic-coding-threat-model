import { defineConfig } from '@playwright/test';

const suppliedBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
const baseURL = suppliedBaseUrl ?? 'http://127.0.0.1:4321/';

if (!baseURL.endsWith('/')) {
	throw new Error('PLAYWRIGHT_BASE_URL must end in "/"');
}

export default defineConfig({
	testDir: './tests',
	testMatch: 'site.spec.ts',
	// One spec drives deterministic screenshots and theme mutation; keeping each
	// project serial avoids Chromium capture contention while projects still run in parallel.
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	failOnFlakyTests: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	reporter: [
		['list'],
		['html', { outputFolder: 'playwright-report', open: 'never' }],
	],
	outputDir: 'test-results',
	use: {
		baseURL,
		screenshot: 'only-on-failure',
		trace: 'retain-on-failure',
	},
	projects: [
		{
			name: 'chromium-desktop',
			use: { browserName: 'chromium', viewport: { width: 1440, height: 1000 } },
		},
		{
			name: 'chromium-mobile',
			use: { browserName: 'chromium', viewport: { width: 390, height: 844 } },
		},
	],
	webServer: suppliedBaseUrl ? undefined : {
		// Astro 7 daemonises when it detects an agent. A defined value opts back
		// into the foreground process Playwright can supervise and terminate.
		command: 'ASTRO_PREVIEW_BACKGROUND=0 npm run preview -- --host 127.0.0.1',
		url: baseURL,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
	},
});
