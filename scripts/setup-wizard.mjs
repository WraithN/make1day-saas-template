#!/usr/bin/env node
// setup-wizard - paste your provider keys into .env.local from a local page.
//
//   node scripts/setup-wizard.mjs            starts on http://127.0.0.1:7777
//   node scripts/setup-wizard.mjs --port 8080
//
// The form is built from your .env.example, so it always matches the
// variables this build actually reads (lib/env.ts). Comments above each
// variable become the help text. Keys are written to .env.local (mode 0600)
// on your machine only - the server binds to 127.0.0.1 and has no other
// network interface. Screenshots are placeholders until the project keeps
// images under docs/screenshots/<PREFIX>.png.
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { exec } from "node:child_process";

const root = process.cwd();
const args = process.argv.slice(2);
const port = Number((args.find((a) => a.startsWith("--port")) ? (args[args.indexOf("--port") + 1] || "7777") : "7777"));

const ENV_EXAMPLE = path.join(root, ".env.example");
const ENV_LOCAL = path.join(root, ".env.local");

function parseExample() {
  if (!fs.existsSync(ENV_EXAMPLE)) {
    console.error("no .env.example in this project - run this from the project root.");
    process.exit(1);
  }
  const lines = fs.readFileSync(ENV_EXAMPLE, "utf8").replace(/\r\n/g, "\n").split("\n");
  const groups = new Map();
  let help = [];
  let section = "General";
  const pushVar = (name, placeholder, commented) => {
    const g = name.split("_")[1] === "PUBLIC" ? "NEXT_PUBLIC" : name.split("_")[0];
    if (!groups.has(g)) groups.set(g, { title: GROUP_TITLES[g] || section, vars: [] });
    const grp = groups.get(g);
    if (!grp.vars.some((v) => v.name === name))
      grp.vars.push({ name, placeholder, help: help.join(" "), commented });
    help = [];
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      help = [];
      continue;
    }
    const box = /^#\s*[─—-]{3,}\s*(.*?)\s*[─—-]*\s*$/.exec(line.trim());
    if (box && box[1]) {
      section = box[1];
      help = [];
      continue;
    }
    if (line.trim().startsWith("#")) {
      const commented = /^#\s*([A-Z][A-Z0-9_]*)=(.*)$/.exec(line.trim());
      if (commented) pushVar(commented[1], commented[2], true);
      else {
        const t = line.trim().replace(/^#+\s*/, "");
        // Short title-style comments ("Supabase (required)") open a section;
        // longer prose is help text for the next variable.
        if (t && t.length <= 42 && !/[.;]$/.test(t)) section = t;
        else if (t) help.push(t);
        if (help.length > 3) help = help.slice(-3);
      }
      continue;
    }
    const m = /^\s*([A-Z][A-Z0-9_]*)=(.*)$/.exec(line);
    if (m) pushVar(m[1], m[2], false);
  }
  return groups;
}

const GROUP_TITLES = {
  SUPABASE: "Database + auth (Supabase)",
  WAFFO: "Payments - Waffo",
  STRIPE: "Payments - Stripe",
  CREEM: "Payments - Creem",
  PAYPAL: "Payments - PayPal",
  LEMONSQUEEZY: "Payments - Lemon Squeezy",
  OPENAI: "AI - OpenAI",
  ANTHROPIC: "AI - Anthropic",
  GEMINI: "AI - Google Gemini",
  GROQ: "AI - Groq",
  DEEPSEEK: "AI - DeepSeek",
  OPENROUTER: "AI - OpenRouter",
  FAL: "Media - fal.ai",
  RESEND: "Email - Resend",
  MAIL: "Email transport",
  NEXT_PUBLIC: "Public site settings",
  ADMIN: "Admin console",
  CRON: "Scheduled jobs",
  SQLITE: "Local fallback database",
  PAYMENT: "Payments - provider selection",
  AI: "AI providers",
  NEXT: "Site settings",
};

function render(groups, existingKeys) {
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const cards = [...groups.entries()]
    .filter(([, g]) => g.vars.length)
    .map(([key, g]) => {
      const title = GROUP_TITLES[key] || g.title || key;
      const fields = g.vars
        .map((v) => {
          const isSecret = /KEY|SECRET|TOKEN|PASSWORD|PRIVATE/i.test(v.name);
          const has = existingKeys.has(v.name);
          const note = v.commented ? ' <em class="opt">optional</em>' : "";
          const ph = has ? "leave blank to keep current value" : v.placeholder || "paste value";
          return `<label class="field">
  <span class="k">${esc(v.name)}${note}${has ? ' <em class="set">already in .env.local</em>' : ""}</span>
  ${v.help ? `<span class="h">${esc(v.help).slice(0, 220)}</span>` : ""}
  <input name="${esc(v.name)}" type="${isSecret ? "password" : "text"}" placeholder="${esc(ph)}" autocomplete="off" spellcheck="false">
</label>`;
        })
        .join("\n");
      return `<section class="group">
  <h2>${esc(title)}</h2>
  <figure class="shot"><img src="/shot/${esc(key)}" alt="screenshot of ${esc(title)} settings" onerror="this.closest('.shot').classList.add('missing')"><figcaption>Illustrated guide: docs/screenshots/${esc(key)}.png — <b>not captured yet</b></figcaption></figure>
  ${fields}
</section>`;
    })
    .join("\n");

  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Setup wizard - key configuration</title>
<style>
 body{font:15px/1.55 -apple-system,"Segoe UI",Roboto,Arial,sans-serif;background:#0b0d10;color:#e8eaed;margin:0;padding:32px 16px}
 main{max-width:880px;margin:0 auto}
 h1{font-size:22px;margin:0 0 6px}
 .sub{color:#9aa3ad;font-size:13px;margin-bottom:24px}
 .group{border:1px solid #22262d;border-radius:12px;padding:18px 20px;margin:0 0 16px;background:#12151a}
 h2{font-size:15px;margin:0 0 12px;text-transform:uppercase;letter-spacing:.04em;color:#5eead4}
 .field{display:block;margin:0 0 12px}
 .k{display:block;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12.5px;color:#e8eaed}
 .set{color:#8aa99a;font-style:normal;font-size:11px}
 .opt{color:#7f8994;font-style:normal;font-size:11px}
 .h{display:block;color:#9aa3ad;font-size:12px;margin:2px 0 4px}
 input{width:100%;box-sizing:border-box;background:#0b0d10;border:1px solid #22262d;border-radius:8px;color:#e8eaed;padding:8px 10px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px}
 input:focus{outline:none;border-color:#5eead4}
 .shot{margin:0 0 14px}
 .shot img{width:100%;border-radius:8px;border:1px solid #22262d;display:block}
 .shot.missing img{display:none}
 .shot.missing{border:1px dashed #22262d;border-radius:8px;padding:10px 12px;color:#9aa3ad;font-size:12px}
 .shot figcaption{font-size:11px;color:#6c7681;margin-top:4px}
 .shot.missing figcaption{margin:0}
 button{background:#5eead4;color:#07211c;font-weight:600;border:0;border-radius:8px;padding:10px 18px;font-size:14px;cursor:pointer}
 .done{border:1px solid #2e5d4e;background:#12241d;border-radius:10px;padding:12px 14px;font-size:13px;margin:0 0 16px;display:none}
 .privacy{color:#6c7681;font-size:11.5px;margin-top:14px}
</style></head><body><main>
 <h1>Setup wizard</h1>
 <p class="sub">Keys are written to <code>.env.local</code> on this machine only. The page is served on 127.0.0.1 and nothing leaves your computer. Blank fields keep existing values.</p>
 <div class="done" id="done"></div>
 <form method="post" action="/save" onsubmit="event.preventDefault();save(this)">
 ${cards}
 <button type="submit">Write .env.local</button>
 </form>
 <p class="privacy">After saving: <code>npm run dev</code> · re-running this wizard keeps everything you already set. Stop the server with Ctrl+C when done.</p>
</main>
<script>
async function save(form){
  const data={};
  new FormData(form).forEach((v,k)=>{ if(String(v).trim()) data[k]=String(v).trim(); });
  const r=await fetch('/save',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});
  const j=await r.json();
  const d=document.getElementById('done');
  d.style.display='block';
  d.textContent=j.ok?('Saved '+j.written+' key(s) to .env.local. Run: npm run dev'):'Save failed: '+j.error;
}
</script></body></html>`;
}

function existingNames() {
  if (!fs.existsSync(ENV_LOCAL)) return new Set();
  return new Set(
    fs
      .readFileSync(ENV_LOCAL, "utf8")
      .split("\n")
      .map((l) => /^\s*([A-Z][A-Z0-9_]*)=/.exec(l))
      .filter(Boolean)
      .map((m) => m[1]),
  );
}

function mergeSave(updates) {
  const lines = fs.existsSync(ENV_LOCAL) ? fs.readFileSync(ENV_LOCAL, "utf8").replace(/\r\n/g, "\n").split("\n") : [];
  let written = 0;
  for (const [k, v] of Object.entries(updates)) {
    if (!/^[A-Z][A-Z0-9_]*$/.test(k)) continue;
    const live = lines.findIndex((l) => l.trim().startsWith(k + "="));
    if (live >= 0) {
      lines[live] = `${k}=${v}`;
    } else {
      const commented = lines.findIndex((l) => new RegExp(`^#\\s*${k}=`).test(l.trim()));
      if (commented >= 0) lines.splice(commented + 1, 0, `${k}=${v}`);
      else lines.push(`${k}=${v}`);
    }
    written++;
  }
  fs.writeFileSync(ENV_LOCAL, lines.join("\n") + "\n", { mode: 0o600 });
  return written;
}

const groups = parseExample();

const server = http.createServer(async (req, res) => {
  if (req.method === "GET") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(render(groups, existingNames()));
    return;
  }
  if (req.method === "POST" && req.url === "/save") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        const written = mergeSave(JSON.parse(body || "{}"));
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: true, written }));
      } catch (e) {
        res.writeHead(500, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }
  res.writeHead(404);
  res.end();
});

server.listen(port, "127.0.0.1", () => {
  const url = `http://127.0.0.1:${port}`;
  console.log(`setup wizard: ${url}  (Ctrl+C to stop; keys stay local)`);
  const cmd =
    process.platform === "win32" ? "start" : process.platform === "darwin" ? "open" : "xdg-open";
  exec(`${cmd} ${url}`, () => {});
});
