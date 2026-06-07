/** Formate un montant en FCFA (ex: 150 000 FCFA) */
export function formatAmount(amount: number): string {
  return amount.toLocaleString("fr-FR").replace(/\u202f/g, "\u00a0") + " FCFA";
}
