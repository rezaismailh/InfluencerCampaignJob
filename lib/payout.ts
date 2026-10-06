// Mirrors public.transfer_fee_for and the Rp 10.000 minimum in the database,
// so the request screen can show the numbers before submitting.
export const MIN_PAYOUT = 10_000;
export const TRANSFER_FEE = 2_500;
export const FREE_TRANSFER_BANKS = ['BCA', 'MANDIRI'];

export const BANKS = [
  'BCA', 'Mandiri', 'BRI', 'BNI', 'BSI', 'CIMB Niaga', 'Permata', 'Danamon', 'BTN',
  'Bank Jago', 'SeaBank', 'blu by BCA Digital', 'GoPay', 'OVO', 'DANA', 'ShopeePay', 'LinkAja',
] as const;

export function transferFeeFor(bank: string): number {
  return FREE_TRANSFER_BANKS.includes(bank.trim().toUpperCase()) ? 0 : TRANSFER_FEE;
}

export function payoutBreakdown(gross: number, bank: string) {
  const fee = transferFeeFor(bank);
  return { gross, fee, net: gross - fee, meetsMinimum: gross >= MIN_PAYOUT };
}

export function maskAccount(last4: string): string {
  return `•••${last4}`;
}
