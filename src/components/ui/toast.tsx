"use client";

import { Toaster as SonnerToaster, toast } from "sonner";
import { useTheme } from "@/components/theme-provider";

export { toast };

export function Toaster() {
  const { theme } = useTheme();

  return (
    <SonnerToaster
      theme={theme}
      position="top-right"
      richColors
      closeButton
      expand={false}
      duration={4000}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-token-lg !shadow-token-lg !border !border-slate-200 dark:!border-slate-700",
          title: "!font-medium",
          description: "!text-slate-600 dark:!text-slate-400",
        },
      }}
    />
  );
}
