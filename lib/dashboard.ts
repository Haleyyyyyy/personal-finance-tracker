import type { TransactionKind } from "./cmb-parser";
import {legacyCategoryKeys,type TransactionType} from "./classification.ts";

export type DashboardTransaction = {
  transaction_date: string;
  amount: number;
  direction: "income" | "expense" | "transfer";
  status: "review" | "confirmed";
  transaction_type?: TransactionType | null;
  category_id?: string | null;
  subcategory_id?: string | null;
  raw_data: { kind?: TransactionKind; budget_category?: string } | null;
};

export type DashboardRange = "all" | "year" | "half" | "custom";

export function resolveMonthRange(transactions: Pick<DashboardTransaction, "transaction_date">[], mode: DashboardRange, customStart?: string, customEnd?: string) {
  const months = transactions.map((tx) => tx.transaction_date.slice(0, 7)).filter((value) => /^\d{4}-\d{2}$/.test(value)).sort();
  const fallback = new Date().toISOString().slice(0, 7);
  const earliest = months[0] ?? fallback;
  const latest = months.at(-1) ?? fallback;
  if (mode === "custom") {
    const valid = /^\d{4}-\d{2}$/.test(customStart ?? "") && /^\d{4}-\d{2}$/.test(customEnd ?? "") && customStart! <= customEnd!;
    return { start: valid ? customStart! : earliest, end: valid ? customEnd! : latest, valid };
  }
  if (mode === "all") return { start: earliest, end: latest, valid: true };
  const endDate = new Date(`${latest}-01T12:00:00`);
  const count = mode === "year" ? 12 : 6;
  const startDate = new Date(endDate.getFullYear(), endDate.getMonth() - (count - 1), 1);
  const rollingStart = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}`;
  return { start: rollingStart < earliest ? earliest : rollingStart, end: latest, valid: true };
}

export function transactionsInMonthRange<T extends Pick<DashboardTransaction, "transaction_date">>(transactions: T[], start: string, end: string) {
  return transactions.filter((tx) => {
    const month = tx.transaction_date.slice(0, 7);
    return month >= start && month <= end;
  });
}

export function rangeLabel(start: string, end: string) {
  const format = (month: string) => `${month.slice(0, 4)}年${month.slice(5, 7)}月`;
  return start === end ? format(start) : `${format(start)} – ${format(end)}`;
}

export const defaultBudgets = [
  { category: "food", amount: 3000, color: "#1f6b52" },
  { category: "shopping", amount: 4000, color: "#4f7cac" },
  { category: "transportation", amount: 1500, color: "#4b968e" },
  { category: "pets", amount: 1000, color: "#b98652" },
  { category: "subscriptions", amount: 500, color: "#7867a8" },
  { category: "other", amount: 1800, color: "#82908a" },
];

export function isOperatingIncome(tx: DashboardTransaction) {
  if(tx.transaction_type)return tx.status === "confirmed" && (tx.transaction_type === "income" || tx.transaction_type === "interest");
  const kind = tx.raw_data?.kind ?? tx.direction;
  return tx.status === "confirmed" && tx.direction === "income" && (kind === "income" || kind === "interest");
}

export function isOrdinaryExpense(tx: DashboardTransaction) {
  if(tx.transaction_type)return tx.status === "confirmed" && tx.transaction_type === "expense";
  return tx.status === "confirmed" && tx.direction === "expense" && (tx.raw_data?.kind ?? tx.direction) === "expense";
}

export function monthlySeries(transactions: DashboardTransaction[], months = 6, anchor = new Date()) {
  return Array.from({ length: months }, (_, index) => {
    const date = new Date(anchor.getFullYear(), anchor.getMonth() - (months - 1 - index), 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const monthRows = transactions.filter((tx) => tx.transaction_date.startsWith(key));
    return {
      key,
      label: `${date.getMonth() + 1}月`,
      income: monthRows.filter(isOperatingIncome).reduce((sum, tx) => sum + Number(tx.amount), 0),
      expense: monthRows.filter(isOrdinaryExpense).reduce((sum, tx) => sum + Number(tx.amount), 0),
    };
  });
}

export function transactionCategoryKey(tx:DashboardTransaction,categoryKeysById?:Map<string,string>){return (tx.category_id&&categoryKeysById?.get(tx.category_id))??legacyCategoryKeys[tx.raw_data?.budget_category??""]??"other"}

export function spendingByCategory(transactions: DashboardTransaction[], monthKey: string,categoryKeysById?:Map<string,string>) {
  const values = new Map<string, number>();
  transactions.filter((tx) => tx.transaction_date.startsWith(monthKey) && isOrdinaryExpense(tx)).forEach((tx) => {
    const category = transactionCategoryKey(tx,categoryKeysById);
    values.set(category, (values.get(category) ?? 0) + Number(tx.amount));
  });
  return values;
}
