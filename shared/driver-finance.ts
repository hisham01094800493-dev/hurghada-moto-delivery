export type WithdrawalCommitment = { amount: number; status: "pending" | "approved" | "rejected" | "paid" };

export function isDriverWalletBlocked(balance: number, creditLimit = 100) {
  return Math.round(balance) <= -Math.max(0, Math.round(creditLimit));
}

export function calculateAvailableWithdrawalBalance(netEarnings: number, withdrawals: WithdrawalCommitment[]) {
  const normalizedNet = Math.max(0, Math.round(netEarnings));
  const committedWithdrawals = withdrawals.filter((withdrawal) => withdrawal.status !== "rejected").reduce((sum, withdrawal) => sum + Math.max(0, Math.round(withdrawal.amount)), 0);
  return { committedWithdrawals, availableToWithdraw: Math.max(0, normalizedNet - committedWithdrawals) };
}
