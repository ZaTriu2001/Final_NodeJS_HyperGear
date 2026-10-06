import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateEarnedPoints, calculateOrderFinancials } from './finance.js';

test('profit subtracts both cost and loyalty discount from original-price revenue', () => {
  const result = calculateOrderFinancials([{ unitPrice: 10_000_000, unitCost: 7_000_000, quantity: 1 }], 500_000);
  assert.deepEqual(result, {
    revenue: 10_000_000,
    costOfGoods: 7_000_000,
    loyaltyDiscount: 500_000,
    amountPaid: 9_500_000,
    profit: 2_500_000,
  });
});

test('an order using loyalty points earns no new points', () => {
  assert.equal(calculateEarnedPoints(9_500_000, true), 0);
  assert.equal(calculateEarnedPoints(9_500_000, false), 95_000);
});

test('points are calculated in complete 100,000 VND blocks', () => {
  assert.equal(calculateEarnedPoints(199_999, false), 1_000);
  assert.equal(calculateEarnedPoints(99_999, false), 0);
});
