export type ToastTone = "neutral" | "success" | "warning" | "danger" | "accent";

export type ToastInput = {
  description?: string;
  durationMs?: number;
  title: string;
  tone?: ToastTone;
};

export type ToastRecord = {
  description?: string;
  durationMs: number;
  id: string;
  title: string;
  tone: ToastTone;
};

export function createToastRecord(input: ToastInput, idSeed: number): ToastRecord {
  return {
    description: input.description,
    durationMs: input.durationMs ?? 4000,
    id: `toast-${idSeed}`,
    title: input.title,
    tone: input.tone ?? "neutral"
  };
}

export function pushToastRecord(toasts: ToastRecord[], toast: ToastRecord, limit = 4) {
  return [...toasts, toast].slice(-limit);
}

export function dismissToastRecord(toasts: ToastRecord[], id: string) {
  return toasts.filter((toast) => toast.id !== id);
}
