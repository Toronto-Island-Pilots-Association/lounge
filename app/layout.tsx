import type { Metadata } from "next";
import { Inter_Tight } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { headers } from "next/headers";
import "./globals.css";
import NavbarWrapper from "@/components/NavbarWrapper";
import PoweredByBadge from "@/components/PoweredByBadge";
import GuestBanner, {
  shouldShowOrgGuestBanner,
} from "@/app/components/GuestBanner";
import { fetchPublicOrgBranding, iconMimeTypeForUrl } from "@/lib/org-public-branding";

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  const domainType = h.get("x-domain-type") ?? "org";
  if (domainType !== "org") {
    return { icons: { icon: "/favicon.ico" } };
  }
  const orgId = h.get("x-org-id");
  if (!orgId) return { icons: { icon: "/favicon.ico" } };
  const b = await fetchPublicOrgBranding(orgId);
  const title = b.displayName || b.name || "ClubLounge";
  const siteIcon = b.siteIconUrl;
  const icons: Metadata["icons"] =
    !siteIcon
      ? { icon: "/favicon.ico" }
      : siteIcon.startsWith("/")
        ? { icon: siteIcon }
        : {
            icon: {
              url: siteIcon,
              type: iconMimeTypeForUrl(siteIcon),
            },
          };
  return {
    title,
    description: `Member portal for ${title}.`,
    icons,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const domainType = headersList.get("x-domain-type") ?? "org";
  const isOrg = domainType === "org";
  const guestPreviewBar = isOrg && (await shouldShowOrgGuestBanner());

  const orgBodyPad = guestPreviewBar
    ? "pt-36 sm:pt-40 md:pt-0"
    : "pt-16 sm:pt-20 md:pt-0";

  return (
    <html lang="en">
      <body
        className={`${interTight.variable} antialiased ${isOrg ? orgBodyPad : ""}`}
      >
        {isOrg && guestPreviewBar && (
          <div className="fixed top-0 left-0 right-0 z-[70] md:static">
            <GuestBanner />
          </div>
        )}
        {isOrg && <NavbarWrapper guestPreviewBar={guestPreviewBar} />}
        {children}
        {isOrg && <PoweredByBadge />}
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
