-- Buyout 12-month free-update window (task #226/#227).
--
-- Buyout keys ship with 12 months of free source updates, then an active Care
-- subscription extends the window. The window lives in `updates_until` and is
-- enforced by checkEntitlement in lib/license.ts. Legacy keys without this
-- column/value are grandfathered (treated as lifetime) by the code.
ALTER TABLE public.licenses
  ADD COLUMN IF NOT EXISTS updates_until timestamptz;
