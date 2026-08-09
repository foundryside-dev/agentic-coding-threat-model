# Semantic Defects in AI-Generated Code

This Starlight site presents the threat model and assurance framework for high-reliability systems that use AI to generate code.

## Requirements

- Node.js `24.13.0` (also recorded in `.node-version`)
- npm `11.6.2`

## Setup

From this directory, install the pinned dependencies:

```sh
npm ci
```

## Development

Start the local development server:

```sh
npm run dev
```

## Validation

Run the Astro type and content checks:

```sh
npm run check
```

Build the static site into `dist/`:

```sh
npm run build
```
