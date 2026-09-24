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

test("支持招商银行空格分栏版式", () => {
  const text = `记账日期 货币 交易金额 联机余额 交易摘要 对手信息
2026-09-01     CNY        -88.00           1,000.00     消费                    便利店
2026-09-02     CNY        +6,000.00        7,000.00     代发款项                工资`;
  const rows = parseCmbStatement(text);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].kind, "expense");
  assert.equal(rows[0].budgetCategory, "餐饮");
  assert.equal(rows[1].kind, "income");
});

test("跨页页眉页脚不会混入交易对手", () => {
  const text = `2026-08-31     CNY        -20.00           980.00     消费                    便利店
温馨提示：请核对流水
记账日期 货币 交易金额 联机余额 交易摘要 对手信息
2026-09-01     CNY        -30.00           950.00     消费                    餐厅`;
  const rows = parseCmbStatement(text);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].counterparty, "便利店");
  assert.equal(rows[1].counterparty, "餐厅");
});

test("联机余额不会混入交易描述", () => {
  const rows = parseCmbStatement("2026-09-01 | CNY | -88.00 | 12,345.67 | 消费 | 便利店");
  assert.equal(rows[0].onlineBalance, 12345.67);
  assert.equal(rows[0].transactionType, "消费");
  assert.equal(rows[0].description, "消费 · 便利店");
});
