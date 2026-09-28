import assert from "node:assert/strict";
import test from "node:test";
import { barChartMinWidth, lineChartDomain, visibleTickIndexes } from "../lib/chart-layout.ts";

test("折线图按可见数据缩放，同时不会夸大小波动", () => {
  const domain = lineChartDomain([180000, 205000, 195000, 240000, 250000, 286000]);
  assert.ok(domain.min < 180000);
  assert.ok(domain.max > 286000);
  const flat = lineChartDomain([100000, 100050]);
  assert.ok(flat.max - flat.min >= 8000);
});

test("月份较多时降低折线图标签密度并保留首尾", () => {
  const ticks = visibleTickIndexes(24, 8);
  assert.equal(ticks[0], 0);
  assert.equal(ticks.at(-1), 23);
  assert.ok(ticks.length <= 8);
});

test("柱状图六个月铺满，更多月份获得内部滚动宽度", () => {
  assert.equal(barChartMinWidth(6), "100%");
  assert.equal(barChartMinWidth(12), "936px");
  assert.equal(barChartMinWidth(24), "1872px");
});
