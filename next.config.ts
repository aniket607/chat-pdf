import type { NextConfig } from "next";
import { copyFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Disable canvas for PDF.js compatibility
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };

    // Copy PDF.js worker to public directory during build (client-side only)
    if (!isServer) {
      const workerSrc = join(process.cwd(), 'node_modules/react-pdf/node_modules/pdfjs-dist/build/pdf.worker.min.mjs');
      const workerDest = join(process.cwd(), 'public/pdf.worker.min.mjs');
      
      if (existsSync(workerSrc) && !existsSync(workerDest)) {
        try {
          copyFileSync(workerSrc, workerDest);
          // Worker copied successfully
        } catch (error) {
          console.warn('⚠️ Could not copy PDF.js worker:', error);
        }
      }
    }

    return config;
  },
};

export default nextConfig;
