export type NormalizedPhone = {
  e164: string;
  original: string;
  valid: boolean;
  warning?: string;
};

export function normalizeHighLevelPhone(phone: string): NormalizedPhone {
  const original = phone.trim();
  const digits = original.replace(/\D/g, "");

  if (!original) {
    return { e164: "", original, valid: false, warning: "missing_phone" };
  }

  if (digits.length === 10) {
    return { e164: `+1${digits}`, original, valid: true };
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return { e164: `+${digits}`, original, valid: true };
  }

  if (original.startsWith("+") && digits.length >= 10 && digits.length <= 15) {
    return { e164: `+${digits}`, original, valid: true };
  }

  return { e164: original, original, valid: false, warning: "invalid_or_ambiguous_phone" };
}

export function isValidHighLevelEmail(email: string) {
  if (!email.trim()) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function compactHighLevelPayload<T extends Record<string, unknown>>(payload: T) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => {
      if (value === undefined || value === null) {
        return false;
      }

      if (typeof value === "string" && value.trim() === "") {
        return false;
      }

      return true;
    })
  ) as Partial<T>;
}
