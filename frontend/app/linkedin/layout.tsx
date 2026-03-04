"use client";

import LinkedInNav from "./components/LinkedInNav";
import { ToastProvider } from "./components/Toast";

export default function LinkedInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <div className="flex min-h-dvh bg-gray-50">
        <LinkedInNav />
        <main className="flex-1 p-4 pt-14 lg:pt-4 lg:p-8 overflow-auto">{children}</main>
      </div>
    </ToastProvider>
  );
}
