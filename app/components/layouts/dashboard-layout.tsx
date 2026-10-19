"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { apiFetch } from "@/lib/api";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const checkAuth = async () => {
      try {
        await apiFetch("/auth/current-user");
        if (isMounted) {
          setIsAuthenticated(true);
        }
      } catch {
        if (isMounted) {
          router.push("/");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    checkAuth();
    return () => {
      isMounted = false;
    };
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="size-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar className="hidden md:flex" />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header />
        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
