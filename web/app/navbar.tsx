"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";

export function NavbarClient() {
  const { isLoggedIn, user, logout } = useAuth();

  return (
    <header className="fixed top-0 w-full bg-white/95 backdrop-blur border-b z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">T</span>
          </div>
          <span className="font-bold text-xl text-secondary">TukangNDeso</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/layanan" className="text-sm text-gray-600 hover:text-primary">Layanan</Link>
          <Link href="/area" className="text-sm text-gray-600 hover:text-primary">Area</Link>
          <Link href="/bantuan" className="text-sm text-gray-600 hover:text-primary">Bantuan</Link>

          {isLoggedIn ? (
            <>
              <Link href="/booking" className="text-sm text-gray-600 hover:text-primary font-medium">Pesan Tukang</Link>
              <Link href="/orders" className="text-sm text-gray-600 hover:text-primary">Order Saya</Link>
              <div className="flex items-center gap-3 ml-2 pl-4 border-l">
                <Link href="/profil" className="text-sm text-secondary font-medium hover:text-primary">
                  {user?.name ?? "Profil"}
                </Link>
                <button onClick={logout} className="text-xs text-gray-400 hover:text-red-500">Keluar</button>
              </div>
            </>
          ) : (
            <Link href="/login" className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-orange-600">
              Masuk / Daftar
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
