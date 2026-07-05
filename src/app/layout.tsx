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
  title: "Jersey Swap — Cross-Sport Athlete Comparison",
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
        <header className="bg-black border-b border-neutral-800">
          {/* Desktop: nav left, logo center */}
          <div className="hidden md:grid md:grid-cols-3 md:items-center px-6 py-1">
            <div className="flex justify-start"><NavTabs /></div>
            <Link href="/" className="flex justify-center items-center overflow-hidden h-28">
              <Image src="/logo.png" alt="Jersey Swap" width={1672} height={941} className="h-60 w-auto" priority />
            </Link>
            <div />
          </div>
          {/* Mobile: logo on top, nav below */}
          <div className="md:hidden flex flex-col items-center px-4 pt-3 pb-2 gap-2">
            <Link href="/">
              <Image src="/logo.png" alt="Jersey Swap" width={1672} height={941} className="w-52 h-[74px] object-cover object-center" priority />
            </Link>
            <NavTabs />
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
