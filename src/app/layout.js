import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PushSetup from "@/components/PushSetup";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  metadataBase: new URL("https://vidnetwork.vercel.app"),
  title: {
    default: "VidNetwork",
    template: "%s — VidNetwork",
  },
  description:
    "VidNetwork is a paid membership community with live video rooms, courses, events, groups and real conversations — connect, learn and grow together in one place.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  openGraph: {
    siteName: "VidNetwork",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1734,
        height: 907,
        alt: "VidNetwork — Connect, Learn & Grow Together",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <PushSetup />
        {children}
      </body>
    </html>
  );
}
