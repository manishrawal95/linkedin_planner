"use client";

import LinkedInNav from "./components/LinkedInNav";
import { ToastProvider } from "./components/Toast";
import { Toaster } from "@/components/ui/sonner";

export default function LinkedInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <div className="flex min-h-dvh bg-[var(--color-bg-page)]">
        <LinkedInNav />
        <main className="flex-1 p-4 pt-14 lg:pt-4 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
      <Toaster
        position="bottom-right"
        toastOptions={{
          className: "!rounded-xl !border-stone-200 !shadow-lg",
        }}
      />
    </ToastProvider>
  );
}
