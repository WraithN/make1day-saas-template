/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Supabase JS is fine on the server; mark it external for the edge runtime
  // used by middleware to avoid bundling issues.
  serverExternalPackages: ["@supabase/supabase-js"],
};

export default nextConfig;
