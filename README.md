# GIC Control Center

GIC is a private operational dashboard for registering client opportunities, managing lifecycle stages, reviewing approval gates, and keeping an auditable project activity trail.

The frontend is a static React application deployed through GitHub Pages. Operational data and operator sessions are handled by the private Supabase API. The public repository contains no credentials; access uses a separately provided operator identifier and password.

## Local development

Install dependencies with `pnpm install`, then run `pnpm dev`. Use `pnpm test`, `pnpm check`, and `pnpm run build` before publishing changes.

## Deployment

Pushing to `main` runs the GitHub Pages workflow. The application uses hash-based routing so direct links remain valid on GitHub Pages.
