import type { NextConfig } from "next";

const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack: () => ({}), // Disable Turbopack, use webpack instead
};

export default withPWA(nextConfig);

// import type { NextConfig } from "next";

// const nextConfig: NextConfig = {
//   reactStrictMode: true,
// };

// export default nextConfig;






// import type { NextConfig } from "next";

// const withPWA = require("next-pwa")({
//   dest: "public",
//   register: true,      // auto register service worker
//   skipWaiting: true,   // activate SW immediately
//   disable: process.env.NODE_ENV === "development", // disable in dev
// });

// const nextConfig: NextConfig = {
//   reactStrictMode: true,
// };

// export default withPWA(nextConfig);





// import type { NextConfig } from "next";

// const nextConfig: NextConfig = {
//   /* config options here */
// };

// export default nextConfig;
