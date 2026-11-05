import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  getCurrentUser,
  getCurrentSubscription,
  isSubscribed,
  type SubscriptionRow,
} from "@/lib/subscriptions";
import { providerLabel } from "@/lib/payments";
import {
  isDemoMode,
  DEMO_COOKIE,
  DEMO_USER,
  DEMO_SUBSCRIPTION,
} from "@/lib/demo";
import { ChatDemo } from "@/components/ChatDemo";
import { SignOut } from "@/components/SignOut";
import { Trans } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const lang = await getLang();
  const demoCookie = (await cookies()).get(DEMO_COOKIE)?.value;
  const demo = isDemoMode() && demoCookie;

  let user: { email?: string | null } | null = null;
  let sub: SubscriptionRow | null = demo ? (DEMO_SUBSCRIPTION as SubscriptionRow) : null;

  if (demo) {
    user = DEMO_USER;
  } else {
    user = await getCurrentUser();
    if (!user) redirect("/login");
    sub = await getCurrentSubscription();
  }

  const active = isSubscribed(sub);

  return (
    <section className="wrap py-10 sm:py-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="eyebrow">
            <Trans k="dash.eyebrow" lang={lang} />
          </div>
          <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">
            <Trans k="dash.welcome" lang={lang} />,{" "}
            {user?.email?.split("@")[0]}
          </h1>
        </div>
        <SignOut />
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <h3 className="font-semibold">
            <Trans k="dash.planStatus" lang={lang} />
          </h3>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">
                <Trans k="dash.plan" lang={lang} />
              </span>
              <span className="font-mono">{sub?.plan ?? "free"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">
                <Trans k="dash.provider" lang={lang} />
              </span>
              <span className="font-mono">
                {providerLabel(sub?.provider ?? "stripe")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">
                <Trans k="dash.status" lang={lang} />
              </span>
              <span
                className={`font-mono ${
                  active ? "text-accent" : "text-yellow-400"
                }`}
              >
                {sub?.status ?? "no subscription"}
              </span>
            </div>
            {sub?.current_period_end && (
              <div className="flex justify-between">
                <span className="text-muted">
                  <Trans k="dash.renews" lang={lang} />
                </span>
                <span className="font-mono">
                  {new Date(sub.current_period_end).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
          {!active && (
            <Link href="/pricing" className="btn-solid mt-5 w-full">
              <Trans k="dash.upgrade" lang={lang} />
            </Link>
          )}
        </div>

        <div className="lg:col-span-2">
          {active ? (
            <ChatDemo />
          ) : (
            <div className="card border-yellow-400/30">
              <h3 className="font-semibold">
                <Trans k="dash.aiLocked" lang={lang} />
              </h3>
              <p className="mt-2 text-sm text-ink-soft">
                <Trans k="dash.aiLocked.d" lang={lang} />
              </p>
              <Link href="/pricing" className="btn-solid mt-5">
                <Trans k="dash.seePlans" lang={lang} />
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
