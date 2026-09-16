import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import Navbar from "@/components/Navbar";
import MobileNav from "@/components/MobileNav";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "IGNITE FF - Competitive Free Fire Tournaments & Cash Prize Matches",
  description: "Join scheduled competitive Free Fire matches (Solo, Lone Wolf, Clash Squad). Play fair, verify results, and win cash prizes credited directly to your secure platform wallet.",
  manifest: "/manifest.json",
  themeColor: "#090d16",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen bg-[#090d16] text-slate-100 flex flex-col pb-16 md:pb-0`}>
        <AuthProvider>
          <Navbar />
          <main className="flex-1">
            {children}
          </main>
          <MobileNav />
        </AuthProvider>
      </body>
    </html>
  );
}
