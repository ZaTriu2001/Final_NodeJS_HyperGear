export function calculateOrderFinancials(lines, loyaltyDiscount = 0) {
  const revenue = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const costOfGoods = lines.reduce((sum, line) => sum + line.unitCost * line.quantity, 0);
  const safeDiscount = Math.min(Math.max(Number(loyaltyDiscount) || 0, 0), revenue);
  const amountPaid = revenue - safeDiscount;
  const profit = amountPaid - costOfGoods;
  return { revenue, costOfGoods, loyaltyDiscount: safeDiscount, amountPaid, profit };
}

export function calculateEarnedPoints(merchandiseRevenue, usedLoyaltyPoints) {
  if (usedLoyaltyPoints) return 0;
  return Math.floor(Math.max(0, merchandiseRevenue) / 100000) * 1000;
}
