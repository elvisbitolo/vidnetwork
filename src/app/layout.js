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
  title: "Community — Paid Video Chat Rooms",
  description: "A members-only community with live video chat rooms.",
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
