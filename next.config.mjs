// The template generator packs THIS source tree at request time (pack.ts
// walks process.cwd(): ROOT_OK dirs + the scripts/ whitelist). Serverless
// deploys only ship traced files, so without these globs /api/generate 500s
// on Vercel because app/, components/, ... are missing from the lambda.
// Self-host/next start is unaffected (the files are already on disk), and
// customer ZIPs simply carry unused tracing hints for pruned routes.
const GENERATOR_SOURCES = [
  "./app/**/*",
  "./components/**/*",
  "./lib/**/*",
  "./public/**/*",
  "./skills/**/*",
  "./inngest/**/*",
  "./contracts/**/*",
  "./supabase/**/*",
  "./scripts/**/*",
  "./middleware.ts",
  "./package.json",
  "./tsconfig.json",
  "./next.config.mjs",
  "./tailwind.config.ts",
  "./postcss.config.mjs",
  "./.gitignore",
  "./LICENSE",
];

/** @type {import('next').NextConfig} */
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL(".", import.meta.url));

const nextConfig = {
  reactStrictMode: true,
  // Pin the tracing root to this repo: Next's auto-detection can pick an
  // ancestor directory when stray lockfiles exist above the project (it then
  // traces the whole home directory and dev compilation stalls).
  outputFileTracingRoot: repoRoot,
  // Supabase JS is fine on the server; mark it external for the edge runtime
  // used by middleware to avoid bundling issues.
  serverExternalPackages: ["@supabase/supabase-js"],
  outputFileTracingIncludes: {
    "/api/generate": GENERATOR_SOURCES,
    "/api/generate/preview": GENERATOR_SOURCES,
    "/api/mcp": GENERATOR_SOURCES,
  },
};

export default nextConfig;
