import type { Metadata } from "next";
import fsSync from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Build matrix — marketit",
  description:
    "Every marketit template build is verified: pruning correctness and a type-check (and, for a subset, a real next build) inside the generated project.",
  robots: { index: false, follow: false },
};

type BuildInfo = {
  ok: boolean;
  sec: number;
  sharedKb: number | null;
  nextKb: number;
};
type CaseRecord = {
  id: string;
  status: "pass" | "fail";
  files?: number;
  zipKB?: number;
  sec?: number;
  build?: BuildInfo | null;
  message?: string;
};
type Report = {
  generatedAt: string;
  base: string;
  total: number;
  passed: number;
  passRate: number;
  builtCases: number;
  cases: CaseRecord[];
};

function loadReport(): Report | null {
  try {
    const p = path.join(process.cwd(), "public", "build-matrix.json");
    if (!fsSync.existsSync(p)) return null;
    return JSON.parse(fsSync.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

export default function BuildMatrixPage() {
  const report = loadReport();

  return (
    <section className="wrap py-10 sm:py-16">
      <div className="eyebrow mb-3">BUILD MATRIX</div>
      <h1 className="text-3xl font-semibold sm:text-4xl">
        Every download is verified to build.
      </h1>
      <p className="mt-3 max-w-2xl text-ink-soft">
        marketit regenerates each template, then asserts pruning correctness and
        runs a type-check inside the generated project. A representative subset
        also runs a real <code className="rounded bg-surface px-1">next build</code>{" "}
        to measure artifact size. This is the last published run.
      </p>

      {!report ? (
        <div className="card mt-8">
          <p className="text-sm text-ink-soft">
            No report published yet. Run the matrix and publish the result:
          </p>
          <pre className="mt-3 overflow-x-auto rounded-xl border border-line bg-surface p-4 text-xs">
            <code>{`LICENSE_GATE=off npx next start -p 3000   # terminal 1
node scripts/verify-matrix.mjs --all --build --publish  # terminal 2`}</code>
          </pre>
        </div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-line p-4 text-center">
              <div className="text-2xl font-semibold text-accent">
                {report.passRate}%
              </div>
              <div className="text-xs text-muted">pass rate</div>
            </div>
            <div className="rounded-xl border border-line p-4 text-center">
              <div className="text-2xl font-semibold text-accent">
                {report.passed}/{report.total}
              </div>
              <div className="text-xs text-muted">cases</div>
            </div>
            <div className="rounded-xl border border-line p-4 text-center">
              <div className="text-2xl font-semibold text-accent">
                {report.builtCases}
              </div>
              <div className="text-xs text-muted">next build</div>
            </div>
            <div className="rounded-xl border border-line p-4 text-center">
              <div className="text-2xl font-semibold text-accent">
                {new Date(report.generatedAt).toLocaleDateString()}
              </div>
              <div className="text-xs text-muted">last run</div>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left text-muted">
                  <th className="py-2 pr-4">Case</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Files</th>
                  <th className="py-2 pr-4">ZIP</th>
                  <th className="py-2 pr-4">next build</th>
                  <th className="py-2 pr-4">.next</th>
                </tr>
              </thead>
              <tbody>
                {report.cases.map((c) => (
                  <tr key={c.id} className="border-b border-line/60">
                    <td className="py-2 pr-4 font-mono text-xs">{c.id}</td>
                    <td className="py-2 pr-4">
                      <span
                        className={
                          c.status === "pass"
                            ? "text-accent"
                            : "text-red-400"
                        }
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="py-2 pr-4">{c.files ?? "—"}</td>
                    <td className="py-2 pr-4">
                      {c.zipKB != null ? `${c.zipKB} KB` : "—"}
                    </td>
                    <td className="py-2 pr-4">
                      {c.build
                        ? `${c.build.sec}s${
                            c.build.sharedKb != null
                              ? ` · ${c.build.sharedKb} kB`
                              : ""
                          }`
                        : "—"}
                    </td>
                    <td className="py-2 pr-4">
                      {c.build ? `${c.build.nextKb} KB` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
