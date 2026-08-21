import "./globals.css";
import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth";
import { NavbarClient } from "./navbar";
import { FooterSection } from "./footer";

export const metadata: Metadata = {
  title: "TukangNDeso — Marketplace Jasa Tukang Mojokerto",
  description: "Cari dan booking tukang profesional di Mojokerto. Harga transparan mulai Rp 30.000/jam.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <AuthProvider>
          <NavbarClient />
          <main className="pt-16 min-h-screen">{children}</main>
          <FooterSection />
        </AuthProvider>
      </body>
    </html>
  );
}
