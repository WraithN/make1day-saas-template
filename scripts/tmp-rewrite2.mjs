import fs from "node:fs";
const path = "lib/i18n-core.ts";
let lines = fs.readFileSync(path, "utf8").replace(/\r\n/g, "\n").split("\n");

const V = {
  "pricing.studio.f1": ["Everything in Buyout Core", "包含 Core 的全部内容", "Core の内容をすべて含む", "Tout Buyout Core", "Alles aus Buyout Core"],
  "pricing.studio.f2": [
    "Plus the AI video & image workflow source module: script, storyboard, cost quote, render, then edit by conversation. Only changed scenes re-render",
    "再加 AI 视频/图片工作流源码模块：脚本、分镜、成本预估、渲染，改哪几个镜头只重渲哪几个",
    "さらに AI 動画・画像ワークフロー・ソースモジュール：台本・絵コンテ・見積り・描画、会話で編集。変更したシーンだけ再描画",
    "Plus le module source IA vidéo & image : script, storyboard, devis, rendu, puis édition conversationnelle. Seuls les plans modifiés sont relus",
    "Dazu das KI-Video-/Bild-Workflow-Quellmodul: Skript, Storyboard, Kostenangebot, Render, Dialog-Edit. Nur geänderte Szenen rechnen neu",
  ],
  "pricing.studio.f3": [
    "Model settings live in your admin console: providers per task, fallbacks, budgets, and a per-run cost ledger",
    "模型配置就在你的管理后台：按任务选供应商、配主备降级、设预算，单次运行成本可查",
    "モデル設定は管理画面で：タスク別プロバイダ・フォールバック・予算、実行別のコスト台帳",
    "La config des modèles est dans votre console : fournisseurs par tâche, replis, budgets, journal de coûts par exécution",
    "Modell-Konfiguration in der Admin-Konsole: Provider je Task, Fallbacks, Budgets, Kosten-Ledger pro Run",
  ],
  "pricing.studio.f4": ["Future AI modules ship to Studio first", "以后新的 AI 模块，Studio 先拿到", "今後の新 AI モジュールは Studio が先行", "Les futurs modules IA arrivent d'abord dans Studio", "Künftige KI-Module zuerst in Studio"],
  "pricing.studio.f5": ["Same license, same 12 months of updates", "授权条款与 Core 相同，同样含 12 个月更新", "ライセンス条件は Core と同じ、12か月更新付き", "Même licence, mêmes 12 mois de mises à jour", "Gleiche Lizenz, gleiche 12 Monate Updates"],
  "pricing.care.f1": [
    "Keeps your updates alive: while Care runs, you can always regenerate a build matching current dependencies",
    "让更新不断档：Care 在期内，随时能重新生成与当前依赖匹配的新构建",
    "更新を途切れさせない：Care 契約中はいつでも、最新の依存に合うビルドを再生成できます",
    "Garde vos mises à jour vivantes : tant que Care court, régénérez un build aligné sur les dépendances actuelles",
    "Hält Updates am Leben: solange Care läuft, jederzeit ein Build nach aktuellen Abhängigkeiten",
  ],
  "pricing.care.f2": [
    "Upstream changes (Next, Supabase, payment and AI SDKs) arrive as mergeable diffs; your edits stay yours",
    "上游变化（Next、Supabase、支付与 AI SDK）以可合并 diff 交付，你自己的改动归你",
    "上流の変更（Next、Supabase、決済・AI SDK）はマージ可能な diff で提供、自身の変更はそのまま保持",
    "Les changements amont (Next, Supabase, SDK paiement et IA) arrivent en diffs fusionnables ; vos modifications restent les vôtres",
    "Upstream-Änderungen (Next, Supabase, Payment- und AI-SDKs) als mergebare Diffs; deine Änderungen bleiben deine",
  ],
  "pricing.care.f3": [
    "Agent docs regenerated monthly so skills, scoped rules and AGENTS.md keep up with Cursor / Claude Code / Codex",
    "skills、scoped rules、AGENTS.md 每月重生成，跟着 Cursor / Claude Code / Codex 的演进走",
    "skills・scoped rules・AGENTS.md は毎月再生成、Cursor / Claude Code / Codex の進化に追随",
    "skills, règles scopées et AGENTS.md régénérés chaque mois pour suivre Cursor / Claude Code / Codex",
    "skills, scoped rules und AGENTS.md monatlich neu erzeugt für Cursor / Claude Code / Codex",
  ],
  "pricing.care.f4": ["New modules and component packs land early", "新模块和组件包优先到手", "新モジュールと部品パックが最速で届く", "Nouveaux modules et packs de composants en avant-première", "Neue Module und Komponenten-Packs zuerst"],
  "pricing.care.f5": [
    "Priority email + ticket support, first response within 12 hours on weekdays",
    "邮件与工单优先处理，工作日 12 小时内首响",
    "メール・チケット優先対応、平日12時間以内に一次返信",
    "Support email et tickets prioritaires, première réponse sous 12 h les jours ouvrés",
    "Priorisierter E-Mail- und Ticket-Support, Erstantwort innerhalb 12 Stunden werktags",
  ],
};

let changed = 0;
for (const [key, vals] of Object.entries(V)) {
  const needle = `"${key}"`;
  const hits = [];
  lines.forEach((l, i) => { if (l.trim().startsWith(needle + ":")) hits.push(i); });
  if (hits.length !== 5) throw new Error(`anchor count ${key}: ${hits.length}`);
  hits.forEach((i, li) => {
    const indent = lines[i].match(/^\s*/)[0];
    lines[i] = `${indent}${needle}: ${JSON.stringify(vals[li])},`;
    changed++;
  });
}

// insert pricing.buyout.f6 right after each locale's buyout.f5 line
const f6 = [
  "One boundary: build your products with it, do not resell it as a template",
  "一条边界：做你自己的产品可以，把源码打包二次售卖不行",
  "境界はひとつ：自社製品に使うのは自由、テンプレとして再販するのは不可",
  "Une seule limite : construisez vos produits, ne revendez pas le code comme gabarit",
  "Eine Grenze: eigene Produkte bauen ja, als Template weiterverkaufen nein",
];
const f5hits = [];
lines.forEach((l, i) => { if (l.trim().startsWith('"pricing.buyout.f5":')) f5hits.push(i); });
if (f5hits.length !== 5) throw new Error("f5 anchors " + f5hits.length);
for (let k = f5hits.length - 1; k >= 0; k--) {
  const i = f5hits[k];
  const indent = lines[i].match(/^\s*/)[0];
  lines.splice(i + 1, 0, `${indent}"pricing.buyout.f6": ${JSON.stringify(f6[k])},`);
  changed++;
}
fs.writeFileSync(path, lines.join("\n"));
console.log(`pricing copy pass 2 done: ${changed} entries`);
