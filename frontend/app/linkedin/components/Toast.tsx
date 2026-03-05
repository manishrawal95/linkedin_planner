"use client";

import { createContext, useContext, useCallback, memo, type ReactNode } from "react";
import { toast as sonnerToast } from "sonner";

interface ToastContextType {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType>({
  success: () => {},
  error: () => {},
  info: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

export const ToastProvider = memo(function ToastProvider({
  children,
}: {
  children: ReactNode;
}) {
  const ctx: ToastContextType = {
    success: useCallback((msg: string) => sonnerToast.success(msg), []),
    error: useCallback((msg: string) => sonnerToast.error(msg), []),
    info: useCallback((msg: string) => sonnerToast.info(msg), []),
  };

  return <ToastContext.Provider value={ctx}>{children}</ToastContext.Provider>;
});
