import type { Metadata } from "next";
import { AuthFlow } from "@/components/AuthFlow";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reset password",
  robots: { index: false, follow: false },
};

/**
 * Local path: the email link carries ?token=<raw one-time token>.
 * Supabase path: the recovery link goes through /auth/callback (PKCE code →
 * session) and lands here with no token; /api/auth/password-reset confirm then
 * calls updateUser() on that session.
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";
  return (
    <section className="wrap flex min-h-[70vh] items-center justify-center py-16">
      <AuthFlow mode="reset" initialToken={token} />
    </section>
  );
}
