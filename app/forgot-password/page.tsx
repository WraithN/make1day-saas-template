import type { Metadata } from "next";
import { AuthFlow } from "@/components/AuthFlow";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Forgot password",
  robots: { index: false, follow: false },
};

/** Entry point reached from the login page's "Forgot password?" link. */
export default function ForgotPasswordPage() {
  return (
    <section className="wrap flex min-h-[70vh] items-center justify-center py-16">
      <AuthFlow mode="forgot" />
    </section>
  );
}
