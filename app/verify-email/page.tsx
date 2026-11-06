import type { Metadata } from "next";
import { AuthFlow } from "@/components/AuthFlow";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Verify email",
  robots: { index: false, follow: false },
};

/**
 * Two ways in:
 *   * GET /api/auth/verify-email?token=… consumes the local token and
 *     redirects here with ?status=ok|invalid (no token in the final URL).
 *   * A Supabase link may arrive with ?token_hash=… — AuthFlow POSTs it to
 *     /api/auth/verify-email confirm (verifyOtp).
 * Otherwise the page offers a form to (re)send a verification email.
 */
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const first = (v: string | string[] | undefined) =>
    typeof v === "string" ? v : "";
  const token = first(sp.token);
  const tokenHash = first(sp.token_hash) || first(sp.tokenHash);
  const status = first(sp.status);
  return (
    <section className="wrap flex min-h-[70vh] items-center justify-center py-16">
      <AuthFlow
        mode="verify"
        initialToken={token}
        initialTokenHash={tokenHash}
        initialStatus={status}
      />
    </section>
  );
}
