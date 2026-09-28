import assert from "node:assert/strict";
import test from "node:test";
import { automaticFxFields, manualFxFields, parseManualRate } from "../lib/fx.ts";

test("手动汇率支持高精度并严格计算本位币金额", () => {
  const fields = manualFxFields(18600, "CNY", "0.047123", "2026-09-28T00:00:00.000Z")!;
  assert.equal(fields.exchange_rate, 0.047123);
  assert.equal(fields.base_amount, 876.4878);
  assert.equal(fields.exchange_rate_source, "manual");
  assert.equal(fields.exchange_rate_date, null);
  assert.equal(fields.conversion_status, "converted");
});

test("手动汇率拒绝空值、零、负数、NaN 与 Infinity", () => {
  for (const value of ["", "0", "-1", "hello", "Infinity", Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(parseManualRate(value), null);
  }
});

test("恢复自动汇率保存实际汇率日期并重新计算", () => {
  const fields = automaticFxFields(35000, "CNY", 0.85423, "2026-09-22", "2026-09-28T00:00:00.000Z")!;
  assert.equal(fields.base_amount, 29898.05);
  assert.equal(fields.exchange_rate_source, "Frankfurter");
  assert.equal(fields.exchange_rate_date, "2026-09-22");
});
