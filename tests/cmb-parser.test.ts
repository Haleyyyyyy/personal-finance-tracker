import assert from "node:assert/strict";
import test from "node:test";
import { monthSummary, parseCmbStatement, transactionFingerprintSources } from "../lib/cmb-parser.ts";
import { cmbFixture } from "./cmb.fixture.ts";

test("招商银行文本流水解析并保留跨行交易对手", () => {
  const rows = parseCmbStatement(cmbFixture);
  assert.equal(rows.length, 11);
  assert.match(rows.find((row) => row.transactionType === "银联代收")!.counterparty, /中信银行.*还款/);
  assert.match(rows.find((row) => row.transactionType === "赎回")!.counterparty, /清算总账户/);
});

test("同日同额交易保留次数且重复上传仍生成稳定 fingerprint", () => {
  const rows = parseCmbStatement(`${cmbFixture}\n2026-09-22 | CNY | -5,000.00 | 本行ATM无卡取款\n2026-09-22 | CNY | -5,000.00 | 本行ATM无卡取款`);
  const first = transactionFingerprintSources("account-1", rows);
  const second = transactionFingerprintSources("account-1", rows);
  assert.equal(new Set(first).size, rows.length);
  assert.deepEqual(first, second);
});

test("关键交易分类不会污染普通收支", () => {
  const rows = parseCmbStatement(cmbFixture);
  assert.equal(rows.find((row) => row.counterparty.includes("UNIQLO"))!.kind, "expense");
  assert.equal(rows.find((row) => row.counterparty.includes("UNIQLO"))!.budgetCategory, "购物");
  assert.equal(rows.find((row) => row.counterparty.includes("ファミリー"))!.kind, "expense");
  assert.equal(rows.find((row) => row.counterparty.includes("ファミリー"))!.budgetCategory, "餐饮");
  assert.deepEqual(rows.filter((row) => row.kind === "fx").map((row) => row.direction), ["transfer", "transfer"]);
  assert.deepEqual(rows.filter((row) => row.kind === "investment").map((row) => row.direction), ["transfer", "transfer"]);
  assert.equal(rows.find((row) => row.kind === "credit_card_repayment")!.direction, "transfer");
  assert.equal(rows.find((row) => row.kind === "cash_withdrawal")!.direction, "transfer");
  assert.equal(rows.find((row) => row.kind === "interest")!.direction, "income");
  assert.equal(rows.find((row) => row.transactionType === "汇入汇款")!.status, "review");
  const summary = monthSummary(rows);
  assert.equal(summary.income, 7755.36 + 24.31);
  assert.equal(summary.expense, 7.75 + 537.24);
});
