import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { ACCOUNT_TIME_ZONE_COOKIE } from "./account-time";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://delenda-quest.andrew-i-funke.chatgpt.site"),
  title: "DELENDA.QUEST",
  description: "A browser-based grand campaign of daily orders and compounding consequences.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <Script id="account-time-zone-bootstrap" strategy="beforeInteractive">
        {`
          try {
            const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            document.cookie = "${ACCOUNT_TIME_ZONE_COOKIE}=" + encodeURIComponent(timeZone) + "; Path=/; Max-Age=31536000; SameSite=Lax" + (location.protocol === "https:" ? "; Secure" : "");
          } catch {}
        `}
      </Script>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
