import test from "node:test";
import assert from "node:assert/strict";
import { isOperatingIncome, isOrdinaryExpense, rangeLabel, resolveMonthRange, transactionsInMonthRange, type DashboardTransaction } from "../lib/dashboard.ts";

const tx = (date: string, direction: DashboardTransaction["direction"], kind: NonNullable<DashboardTransaction["raw_data"]>["kind"], amount = 10): DashboardTransaction => ({ transaction_date: date, direction, amount, status: "confirmed", raw_data: { kind } });
const rows = [tx("2025-06-03", "income", "income"), tx("2026-09-20", "expense", "expense")];

test("时间范围根据实际交易月份计算", () => {
  assert.deepEqual(resolveMonthRange(rows, "all"), { start: "2025-06", end: "2026-09", valid: true });
  assert.deepEqual(resolveMonthRange(rows, "half"), { start: "2026-04", end: "2026-09", valid: true });
  assert.equal(rangeLabel("2026-09", "2026-09"), "2026年09月");
});

test("自定义月份允许同月并拒绝倒序", () => {
  assert.deepEqual(resolveMonthRange(rows, "custom", "2026-09", "2026-09"), { start: "2026-09", end: "2026-09", valid: true });
  assert.equal(resolveMonthRange(rows, "custom", "2026-10", "2026-09").valid, false);
  assert.equal(transactionsInMonthRange(rows, "2026-09", "2026-09").length, 1);
});

test("KPI 明细只使用同一分类口径", () => {
  const sample = [tx("2026-09-01", "income", "income", 100), tx("2026-09-02", "income", "interest", 5), tx("2026-09-03", "expense", "expense", 30), tx("2026-09-04", "transfer", "credit_card_repayment", 90), tx("2026-09-05", "transfer", "investment", 80)];
  assert.equal(sample.filter(isOperatingIncome).reduce((sum, item) => sum + item.amount, 0), 105);
  assert.equal(sample.filter(isOrdinaryExpense).reduce((sum, item) => sum + item.amount, 0), 30);
});
