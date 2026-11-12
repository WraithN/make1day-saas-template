-- Buyout packages: Core (base) vs Studio (+ AI video/image workflow module
-- and the model-routing admin console). plan stays "buyout" for both; pkg
-- records WHICH package the paid order unlocked. Absent = legacy row whose
-- package is unknown (treated as grandfathered full access).
alter table licenses add column if not exists pkg text check (pkg in ('core','studio'));
create index if not exists idx_licenses_email_pkg on licenses(email, pkg);
