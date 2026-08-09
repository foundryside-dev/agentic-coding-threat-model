import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

const acfId = z.string().regex(/^ACF-[STRIDE]\d$/);

export const acfSchema = z.object({
	id: acfId,
	name: z.string().trim().min(1),
	stride: z.enum(['spoofing', 'tampering', 'repudiation', 'information-disclosure', 'denial-of-service', 'elevation-of-privilege']),
	failure_layer: z.enum(['training-bias', 'context-collapse', 'process-volume']),
	entry_type: z.enum(['code-pattern', 'process-threat', 'workflow-pattern']),
	relation: z.enum(['agent-specific', 'known-class-agent-amplified']),
	risk_level: z.enum(['critical', 'high', 'medium']),
	detection_status: z.enum(['none', 'partial', 'na']),
	detection_note: z.string().trim().min(1).optional(),
	portable_coverage: z.enum([
		'covered',
		'partial',
		'not-covered',
		'not-covered-bespoke-only',
		'na-design-constraint',
		'indirect-only',
	]),
	entry_status: z.enum(['core', 'provisional']),
	language_generality: z.enum(['language-general', 'python-specific']),
	related: z.array(acfId).default([]),
}).strict();

const ruleSchema = z.object({
	id: z.string().regex(/^(PY|RS)-WL-\d{3}$/),
	language: z.enum(['python', 'rust']),
	family: z.enum(['boundary', 'sink']),
	base_severity: z.enum(['ERROR', 'WARN', 'INFO']),
	maturity: z.enum(['stable', 'preview']),
	summary: z.string().trim().min(1),
	cwes: z.array(z.string().regex(/^CWE-\d+$/)).default([]),
	covers_acf: z.array(acfId).default([]),
}).strict();

const latticeSchema = z.object({
	id: z.string().trim().min(1),
	rank: z.int().min(0).max(7),
	state: z.string().trim().min(1),
	origin: z.enum(['declared', 'inferred']),
	set_by: z.string().trim().min(1),
	meaning: z.string().trim().min(1),
	colour: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
}).strict();

export const collections = {
	docs: defineCollection({
		loader: docsLoader(),
		schema: docsSchema({ extend: z.object({ acf: acfSchema.optional() }) }),
	}),
	wardlineRules: defineCollection({
		loader: glob({ base: './src/data/wardline-rules', pattern: '*.yaml' }),
		schema: ruleSchema,
	}),
	lattice: defineCollection({
		loader: file('./src/data/trust-lattice.yaml'),
		schema: latticeSchema,
	}),
};
