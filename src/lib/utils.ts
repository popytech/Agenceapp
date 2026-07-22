import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatGNF(amount: number | null | undefined): string {
  if (amount == null) return '0 GNF'
  // Utiliser des espaces ASCII simples comme séparateur de milliers (évite les caractères spéciaux fr-FR)
  const formatted = Math.round(Number(amount)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return formatted + ' GNF'
}
