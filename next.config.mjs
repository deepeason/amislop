import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Initialize Cloudflare bindings only for local dev
if (process.env.NODE_ENV === 'development' && !process.env.VERCEL) {
  initOpenNextCloudflareForDev();
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
};

export default nextConfig;
