#!/usr/bin/env node
// setup-doctor - environment check for THIS project.
//
// Detects the toolchain the project expects (Node, npm, git) and the
// optional provider CLIs (Vercel, Supabase, Cloudflare wrangler, GitHub).
// Prints the exact install command for your OS for anything missing, and
// tells you to run the key wizard next.
//
//   node scripts/setup-doctor.mjs          human report
//   node scripts/setup-doctor.mjs --json   machine-readable (for AI agents)
//   node scripts/setup-doctor.mjs --fix    run the safe npm -g installs
//
// Exit codes: 0 = required tools present (optional gaps are fine),
//             1 = a REQUIRED tool is missing or Node is too old.
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const doFix = args.includes("--fix");

const platform = process.platform; // win32 | darwin | linux
const install = {
  win32: {
    "Node.js 20+": "winget install OpenJS.NodeJS.LTS  (or https://nodejs.org)",
    git: "winget install Git.Git  (or https://git-scm.com/windows)",
    brew: null,
  },
  darwin: {
    "Node.js 20+": "brew install node@22   (or https://nodejs.org)",
    git: "xcode-select --install",
    brew: "/bin/bash -c \"$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\"",
  },
  linux: {
    "Node.js 20+": "curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs",
    git: "sudo apt-get install -y git",
    brew: null,
  },
};

function version(cmd, flag = "--version") {
  try {
    return execFileSync(cmd, [flag], { encoding: "utf8", timeout: 15000, stdio: ["ignore", "pipe", "ignore"] })
      .split("\n")[0]
      .trim()
      .slice(0, 60);
  } catch {
    return null;
  }
}

const TOOLS = [
  {
    id: "node",
    label: "Node.js 20+",
    required: true,
    found: version("node"),
    check: () => {
      const v = process.versions.node;
      const major = Number(v.split(".")[0]);
      return { ok: major >= 20, version: v, hint: "v20+ required (v22 recommended)" };
    },
    installCmd: install[platform]?.["Node.js 20+"],
  },
  { id: "npm", required: true, found: version("npm"), installCmd: "comes with Node.js" },
  { id: "git", required: true, found: version("git"), installCmd: install[platform]?.git },
  {
    id: "vercel",
    label: "Vercel CLI (deploy target vercel)",
    required: false,
    found: version("vercel"),
    installCmd: "npm i -g vercel",
  },
  {
    id: "supabase",
    label: "Supabase CLI (database)",
    required: false,
    found: version("supabase"),
    installCmd: "npm i -g supabase",
  },
  {
    id: "wrangler",
    label: "Cloudflare wrangler (deploy target cloudflare)",
    required: false,
    found: version("wrangler") || version("npx", "-y wrangler --version"),
    installCmd: "npm i -g wrangler",
  },
  {
    id: "gh",
    label: "GitHub CLI (repo push / CI)",
    required: false,
    found: version("gh"),
    installCmd:
      platform === "win32"
        ? "winget install GitHub.cli"
        : platform === "darwin"
          ? "brew install gh"
          : "sudo apt-get install -y gh",
  },
];

const results = [];
for (const t of TOOLS) {
  let v = t.found;
  let ok = !!v;
  let hint;
  if (t.check) {
    const c = t.check();
    ok = c.ok;
    v = c.version;
    hint = c.ok ? undefined : c.hint;
  }
  results.push({ id: t.id, label: t.label || t.id, required: t.required, ok, version: v || null, installCmd: t.installCmd });
}

if (doFix) {
  const npmGlobals = results.filter((r) => !r.ok && r.installCmd && r.installCmd.startsWith("npm i -g"));
  for (const r of npmGlobals) {
    const pkg = r.installCmd.replace("npm i -g ", "");
    console.error(`installing ${pkg} ...`);
    try {
      execFileSync("npm", ["i", "-g", pkg], { stdio: "inherit", timeout: 300000 });
      r.ok = true;
      r.version = "installed";
    } catch {
      r.installCmd = `${r.installCmd}  (auto-install failed - run it yourself)`;
    }
  }
}

if (asJson) {
  console.log(JSON.stringify({ platform, tools: results }, null, 2));
} else {
  console.log(`\nsetup-doctor  (${platform})\n`);
  for (const r of results) {
    const mark = r.ok ? "OK  " : r.required ? "MISS" : "opt ";
    console.log(` ${mark} ${r.label.padEnd(46)} ${r.ok ? (r.version || "found") : "not found"}`);
    if (!r.ok && r.installCmd) console.log(`      install: ${r.installCmd}`);
  }
  const missingRequired = results.filter((r) => r.required && !r.ok);
  const missingOptional = results.filter((r) => !r.required && !r.ok);
  if (missingRequired.length) {
    console.log(`\n${missingRequired.length} REQUIRED tool(s) missing - install them before continuing.`);
  } else {
    console.log(`\nRequired tools: all present.${missingOptional.length ? ` ${missingOptional.length} optional provider CLI(s) missing - install them when you use that provider.` : ""}`);
    console.log("Next: node scripts/setup-wizard.mjs   (browser page to paste your API keys into .env.local)");
  }
}
const fail = results.some((r) => r.required && !r.ok);
process.exit(fail ? 1 : 0);
