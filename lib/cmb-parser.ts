export type TransactionKind =
  | "income"
  | "expense"
  | "transfer"
  | "investment"
  | "fx"
  | "cash_withdrawal"
  | "interest"
  | "credit_card_repayment";

export type ParsedTransaction = {
  date: string;
  currency: string;
  signedAmount: number;
  amount: number;
  transactionType: string;
  counterparty: string;
  description: string;
  direction: "income" | "expense" | "transfer";
  kind: TransactionKind;
  budgetCategory: string | null;
  status: "confirmed" | "review";
};

const dateStart = /\d{4}-\d{2}-\d{2}(?:\s*\|\s*)*[A-Z]{3}(?:\s*\|\s*)*[+-]?[\d,]+\.\d{2}/g;

function clean(value: string) {
  return value.replace(/\s+/g, " ").replace(/^\|+|\|+$/g, "").trim();
}

function joinWrappedText(value: string) {
  return clean(value).replace(/([\p{Script=Han}])\s+(?=[\p{Script=Han}])/gu, "$1");
}

function classify(type: string, counterparty: string, signedAmount: number) {
  const haystack = `${type} ${counterparty}`;
  if (/结售汇|购汇|售汇/.test(haystack)) return { direction: "transfer" as const, kind: "fx" as const, status: "confirmed" as const };
  if (/申购|赎回|理财|基金/.test(haystack)) return { direction: "transfer" as const, kind: "investment" as const, status: "confirmed" as const };
  if (/信用卡.*还款|还款.*信用卡|信用卡预约还款/.test(haystack)) return { direction: "transfer" as const, kind: "credit_card_repayment" as const, status: "confirmed" as const };
  if (/ATM.*取款|柜台取现|现金支取/.test(haystack)) return { direction: "transfer" as const, kind: "cash_withdrawal" as const, status: "confirmed" as const };
  if (/结息|利息/.test(haystack)) return { direction: "income" as const, kind: "interest" as const, status: "confirmed" as const };
  if (/代发款项|工资|薪资/.test(haystack)) return { direction: "income" as const, kind: "income" as const, status: "confirmed" as const };
  if (/汇入汇款|银联代付/.test(haystack) && signedAmount > 0) return { direction: "income" as const, kind: "income" as const, status: "review" as const };
  if (/转账汇款/.test(type)) return { direction: "transfer" as const, kind: "transfer" as const, status: "review" as const };
  if (signedAmount < 0 && /微信转账/.test(counterparty)) return { direction: "expense" as const, kind: "expense" as const, status: "review" as const };
  if (signedAmount < 0 && /消费|支付/.test(type)) return { direction: "expense" as const, kind: "expense" as const, status: counterparty ? "confirmed" as const : "review" as const };
  if (signedAmount > 0) return { direction: "income" as const, kind: "income" as const, status: "review" as const };
  return { direction: "expense" as const, kind: "expense" as const, status: "review" as const };
}

export function budgetCategoryFor(description: string, kind: TransactionKind) {
  if (kind !== "expense") return null;
  if (/餐|咖啡|茶|饮品|便利店|ファミリー|Seven-Eleven|SEIYU|美团|饿了么/i.test(description)) return "餐饮";
  if (/UNIQLO|银座|商场|京东|淘宝|LOFT|PARCO|MATSUYA|MIKIMOTO/i.test(description)) return "购物";
  if (/滴滴|地铁|铁路|航空|机场|打车|公交|加油/i.test(description)) return "交通";
  if (/宠物|医院|药房|诊所|体检/i.test(description)) return "健康";
  if (/电影|游戏|娱乐|演出|旅行|酒店/i.test(description)) return "娱乐";
  return "其他";
}

export function parseCmbStatement(text: string): ParsedTransaction[] {
  const normalized = text.replace(/\u00a0/g, " ");
  const starts = [...normalized.matchAll(dateStart)];
  return starts.map((match, index) => {
    const header = match[0].replace(/\|/g, " ").replace(/\s+/g, " ").trim();
    const parts = header.split(" ");
    const date = parts[0];
    const currency = parts[1];
    const signedAmount = Number(parts[2].replace(/,/g, ""));
    const end = index + 1 < starts.length ? starts[index + 1].index! : normalized.length;
    const tail = normalized.slice(match.index! + match[0].length, end);
    const allTokens = tail.split("|").map(clean).filter(Boolean);
    const footerIndex = allTokens.findIndex((x) => /\*{3}|温馨提示|^\d+\/\d+$/.test(x));
    const tokens = footerIndex >= 0 ? allTokens.slice(0, footerIndex) : allTokens;
    const transactionType = tokens.shift() ?? "未识别";
    const counterparty = joinWrappedText(tokens.filter((x) => !/^(Date|Currency|Transaction|Amount|Balance|Transaction Type|Counter Party)$/.test(x)).join(" "));
    const classification = classify(transactionType, counterparty, signedAmount);
    const description = counterparty ? `${transactionType} · ${counterparty}` : transactionType;
    return {
      date,
      currency,
      signedAmount,
      amount: Math.abs(signedAmount),
      transactionType,
      counterparty,
      description,
      budgetCategory: budgetCategoryFor(description, classification.kind),
      ...classification,
    };
  });
}

export function transactionFingerprintSources(accountId: string, transactions: ParsedTransaction[]) {
  const occurrences = new Map<string, number>();
  return transactions.map((row) => {
    const base = [accountId, row.date, row.currency, row.signedAmount, row.transactionType, row.counterparty].join("|");
    const occurrence = (occurrences.get(base) ?? 0) + 1;
    occurrences.set(base, occurrence);
    return `${base}|${occurrence}`;
  });
}

export function monthSummary(transactions: Array<Pick<ParsedTransaction, "amount" | "direction" | "kind" | "status">>) {
  return transactions.reduce((total, tx) => {
    if (tx.status !== "confirmed") return total;
    if (tx.direction === "income" && (tx.kind === "income" || tx.kind === "interest")) total.income += tx.amount;
    if (tx.direction === "expense" && tx.kind === "expense") total.expense += tx.amount;
    total.balance = total.income - total.expense;
    total.savingsRate = total.income ? Math.round((total.balance / total.income) * 100) : 0;
    return total;
  }, { income: 0, expense: 0, balance: 0, savingsRate: 0 });
}
