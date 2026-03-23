import type { Metadata } from "next";
import { Inter_Tight } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { headers } from "next/headers";
import "./globals.css";
import NavbarWrapper from "@/components/NavbarWrapper";
import PoweredByBadge from "@/components/PoweredByBadge";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const domainType = headersList.get("x-domain-type") ?? "org";
  const isOrg = domainType === "org";

  return (
    <html lang="en">
      <body
        className={`${interTight.variable} antialiased ${isOrg ? "pt-16 sm:pt-20 md:pt-0" : ""}`}
      >
        {isOrg && <NavbarWrapper />}
        {children}
        {isOrg && <PoweredByBadge />}
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
