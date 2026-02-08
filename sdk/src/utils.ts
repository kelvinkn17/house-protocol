import clsx from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ClassValue } from 'clsx'
import { formatUnits } from 'viem'

export const cnm = (...values: Array<ClassValue>) => twMerge(clsx(values))

// format raw 6-decimal USDH amount to human readable
export function formatUsdh(raw: string): string {
  const num = parseFloat(formatUnits(BigInt(raw || '0'), 6))
  return num.toFixed(2)
}
