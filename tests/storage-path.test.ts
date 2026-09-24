import assert from "node:assert/strict";
import test from "node:test";
import { statementStoragePath } from "../lib/pdf.ts";

test("中文账单名生成纯 ASCII Storage key", async () => {
  const path = await statementStoragePath(
    "1b9ed4ba-4927-4afa-860b-0944225d798d",
    "招商银行交易流水_PrivateFinanceTracker_强脱敏版.pdf",
    1790244522046,
  );
  assert.match(path, /^1b9ed4ba-4927-4afa-860b-0944225d798d\/1790244522046-[a-f0-9]{16}\.pdf$/);
  assert.doesNotMatch(path, /[^\x20-\x7E]/);
});
