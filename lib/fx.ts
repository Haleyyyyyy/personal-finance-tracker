export type FxFields = {
  exchange_rate: number;
  exchange_rate_source: "manual" | "Frankfurter";
  exchange_rate_date: string | null;
  exchange_rate_updated_at: string;
  base_amount: number;
  base_currency: string;
  conversion_status: "converted";
};

export function parseManualRate(value: string | number): number | null {
  if (typeof value === "string" && value.trim() === "") return null;
  const rate = typeof value === "number" ? value : Number(value);
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

function convertedAmount(originalAmount: number, rate: number) {
  return Math.round(originalAmount * rate * 1_000_000) / 1_000_000;
}

export function manualFxFields(originalAmount: number, baseCurrency: string, value: string | number, now = new Date().toISOString()): FxFields | null {
  const rate = parseManualRate(value);
  if (rate === null || !Number.isFinite(originalAmount)) return null;
  return {
    exchange_rate: rate,
    exchange_rate_source: "manual",
    exchange_rate_date: null,
    exchange_rate_updated_at: now,
    base_amount: convertedAmount(originalAmount, rate),
    base_currency: baseCurrency,
    conversion_status: "converted",
  };
}

export function automaticFxFields(originalAmount: number, baseCurrency: string, rate: number, rateDate: string, now = new Date().toISOString()): FxFields | null {
  const validRate = parseManualRate(rate);
  if (validRate === null || !rateDate || !Number.isFinite(originalAmount)) return null;
  return {
    exchange_rate: validRate,
    exchange_rate_source: "Frankfurter",
    exchange_rate_date: rateDate,
    exchange_rate_updated_at: now,
    base_amount: convertedAmount(originalAmount, validRate),
    base_currency: baseCurrency,
    conversion_status: "converted",
  };
}
