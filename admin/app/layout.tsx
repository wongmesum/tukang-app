import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "TukangNDeso Admin",
  description: "Admin panel untuk mengelola TukangNDeso marketplace",
};

function Sidebar() {
  const links = [
    { href: "/", label: "Dashboard", icon: "📊" },
    { href: "/workers", label: "Tukang", icon: "👷" },
    { href: "/orders", label: "Orders", icon: "📋" },
    { href: "/disputes", label: "Disputes", icon: "⚠️" },
    { href: "/categories", label: "Kategori", icon: "📂" },
    { href: "/services", label: "Layanan & Tarif", icon: "🔧" },
    { href: "/pricing", label: "Konfigurasi Harga", icon: "💰" },
    { href: "/reports", label: "Laporan", icon: "📈" },
    { href: "/settings", label: "Pengaturan", icon: "⚙️" },
  ];

  return (
    <aside className="w-64 bg-secondary text-white min-h-screen p-4 flex flex-col">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-primary">TukangNDeso</h1>
        <p className="text-sm text-gray-400">Admin Panel</p>
      </div>
      <nav className="space-y-2 flex-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <span>{link.icon}</span>
            <span>{link.label}</span>
          </Link>
        ))}
      </nav>
      <div className="border-t border-white/10 pt-4 mt-4">
        <Link
          href="/login"
          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 text-sm"
        >
          <span>🔑</span>
          <span>Login / Ganti Akun</span>
        </Link>
      </div>
    </aside>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="flex bg-gray-50">
        <Sidebar />
        <main className="flex-1 p-8 min-h-screen">{children}</main>
      </body>
    </html>
  );
}
