import { toast } from "@/hooks/use-toast";

/**
 * Studio UI uses `@/hooks/use-toast` (shadcn). The play shell
 * (`SaveLoadMenu` and related) keeps `sonner` — do not mix them.
 */
export function toastError(title: string, err: unknown) {
  toast({
    title,
    description: err instanceof Error ? err.message : String(err),
    variant: "destructive",
  });
}

/** Destructive toast with a plain message (validation / empty-field UX). */
export function toastFail(title: string, description?: string) {
  toast({ title, description, variant: "destructive" });
}

export function toastOk(title: string, description?: string) {
  toast({ title, description });
}
