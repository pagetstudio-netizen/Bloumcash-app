import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * True when the app is running inside a Median.co native wrapper (iOS / Android).
 * Use this to conditionally show mobile-only features.
 */
export const isMedianApp: boolean =
  navigator.userAgent.indexOf("median") > -1;

export function formatAmount(amount: number): string {
  return amount.toLocaleString("fr-FR").replace(/\u202f/g, " ") + " FCFA";
}

export type TogoOperator = "tmoney" | "moov" | null;

export function validateTogoPhone(phone: string): { normalized: string; operator: TogoOperator; valid: boolean } {
  const cleaned = phone.replace(/\s+/g, "").replace(/-/g, "");
  let digits = cleaned;

  if (digits.startsWith("+228")) {
    digits = digits.slice(4);
  } else if (digits.startsWith("228")) {
    digits = digits.slice(3);
  }

  if (digits.length !== 8 || !/^\d{8}$/.test(digits)) {
    return { normalized: phone, operator: null, valid: false };
  }

  const prefix = parseInt(digits.slice(0, 2));
  let operator: TogoOperator = null;

  if ([90, 91, 92, 93].includes(prefix)) {
    operator = "tmoney";
  } else if ([96, 97, 98, 99].includes(prefix)) {
    operator = "moov";
  }

  return {
    normalized: "+228" + digits,
    operator,
    valid: operator !== null,
  };
}
