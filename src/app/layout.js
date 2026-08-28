import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import Providers from "@/components/Providers";
import PushSetup from "@/components/PushSetup";
import GlobalTheme from "@/components/GlobalTheme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  metadataBase: new URL("https://yarnerylounge.vercel.app"),
  title: {
    default: "Yarnery Lounge",
    template: "%s — Yarnery Lounge",
  },
  description:
    "Yarnery Lounge is a paid membership community with live video rooms, courses, events, groups and real conversations — connect, learn and grow together in one place.",
  manifest: "/manifest.webmanifest",
  other: {
    "google-site-verification": "EO1A_95MmyPuFD2ULeSrZ2xzliMUJEdAWtRmclDUwPo",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  openGraph: {
    siteName: "Yarnery Lounge",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1734,
        height: 907,
        alt: "Yarnery Lounge — Connect, Learn & Grow Together",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://yarnerylounge.vercel.app",
  },
};

export default async function RootLayout({ children }) {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en";
  const messages = {
    en: (await import("../../messages/en.json")).default,
    fr: (await import("../../messages/fr.json")).default,
    de: (await import("../../messages/de.json")).default,
  };
  return (
    <html lang={locale} className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <Providers messages={messages} locale={locale}>
          <PushSetup />
          {children}
        </Providers>
      </body>
    </html>
  );
}
