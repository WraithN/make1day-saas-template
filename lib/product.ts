import { env } from "@/lib/env";

/**
 * Deployment-scoped product id. One Supabase project can host several
 * products (each deployment sets PRODUCT_ID); `profiles.product` carries the
 * affiliation and every console / RBAC query filters by it, so the same auth
 * e-mail holds independent identities, roles and directories per product.
 * Edge-safe (reads env only).
 */
export function productId(): string {
  return env.productId();
}
