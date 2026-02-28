import type { Metadata } from "next";
import { Inter_Tight } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import Navbar from "@/components/Navbar";

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Toronto Island Pilots Association",
  description: "TIPA is dedicated to the preservation and promotion of general aviation at Billy Bishop Toronto City Airport (CYTZ).",
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${interTight.variable} antialiased pt-16 sm:pt-20 md:pt-0`}
      >
        <Navbar />
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
