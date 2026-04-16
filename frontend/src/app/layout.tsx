// C:\Users\Melody\Documents\Spotter\frontend\src\app\layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SPOTTER – Talent Matching Platform",
  description: "Connect talent with opportunity through intelligent matching",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { fontSize: "14px" },
            success: { iconTheme: { primary: "#16a34a", secondary: "#fff" } },
            error:   { iconTheme: { primary: "#CC0000", secondary: "#fff" } },
          }}
        />
        {children}
      </body>
    </html>
  );
}
