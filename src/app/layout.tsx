import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { NavTabs } from "@/components/NavTabs";
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
  title: "SportsTranslate — Cross-Sport Athlete Translator",
  description: "Type any athlete, pick a sport, and find their closest equivalent.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="grid grid-cols-3 items-center border-b border-neutral-800 px-6 py-3">
          <div />
          <Link href="/" className="flex justify-center">
            <Image src="/logo.png" alt="SportsTranslate" width={1916} height={821} className="h-16 w-auto" priority />
          </Link>
          <div className="flex justify-end">
            <NavTabs />
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
