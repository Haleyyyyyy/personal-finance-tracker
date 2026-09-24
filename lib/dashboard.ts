import type { TransactionKind } from "./cmb-parser";

export type DashboardTransaction = {
  transaction_date: string;
  amount: number;
  direction: "income" | "expense" | "transfer";
  status: "review" | "confirmed";
  raw_data: { kind?: TransactionKind; budget_category?: string } | null;
};

export const defaultBudgets = [
  { category: "餐饮", amount: 3000, color: "#1f6b52" },
  { category: "购物", amount: 4000, color: "#4f7cac" },
  { category: "交通", amount: 1500, color: "#7b61a8" },
  { category: "健康", amount: 1200, color: "#2d8a7b" },
  { category: "娱乐", amount: 1500, color: "#c28b35" },
  { category: "其他", amount: 1800, color: "#82908a" },
];

export function isOperatingIncome(tx: DashboardTransaction) {
  const kind = tx.raw_data?.kind ?? tx.direction;
  return tx.status === "confirmed" && tx.direction === "income" && (kind === "income" || kind === "interest");
}

export function isOrdinaryExpense(tx: DashboardTransaction) {
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

export function spendingByCategory(transactions: DashboardTransaction[], monthKey: string) {
  const values = new Map<string, number>();
  transactions.filter((tx) => tx.transaction_date.startsWith(monthKey) && isOrdinaryExpense(tx)).forEach((tx) => {
    const category = tx.raw_data?.budget_category ?? "其他";
    values.set(category, (values.get(category) ?? 0) + Number(tx.amount));
  });
  return values;
}
