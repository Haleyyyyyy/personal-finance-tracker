"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { ArrowDownLeft, ArrowUpRight, Check, CircleAlert, FileText, Landmark, LoaderCircle, LogOut, PiggyBank, Plus, Upload, WalletCards } from "lucide-react";
import { monthSummary, parseCmbStatement, transactionFingerprintSources, type TransactionKind } from "../lib/cmb-parser";
import { extractPdfText, sha256 } from "../lib/pdf";
import { supabase } from "../lib/supabase";

type Account = { id: string; name: string; institution: string | null; currency: string | null; account_type: string | null };
type Statement = { id: string; file_name: string; status: string; period_start: string | null; period_end: string | null; created_at: string };
type Tx = {
  id: string; transaction_date: string; description: string; amount: number; direction: "income" | "expense" | "transfer";
  status: "review" | "confirmed"; raw_data: { kind?: TransactionKind; currency?: string; transaction_type?: string; counterparty?: string } | null;
};
type Notice = { tone: "success" | "error" | "info"; text: string } | null;
type Tab = "overview" | "transactions" | "review" | "accounts" | "statements";

const kindLabels: Record<TransactionKind, string> = {
  income: "收入", expense: "普通消费", transfer: "资金转移", investment: "理财",
  fx: "结售汇", cash_withdrawal: "取现", interest: "利息", credit_card_repayment: "信用卡还款",
};

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [statements, setStatements] = useState<Statement[]>([]);
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    setDataLoading(true);
    const client = supabase();
    const [accountResult, statementResult, transactionResult] = await Promise.all([
      client.from("accounts").select("id,name,institution,currency,account_type").order("created_at"),
      client.from("statements").select("id,file_name,status,period_start,period_end,created_at").order("created_at", { ascending: false }).limit(20),
      client.from("transactions").select("id,transaction_date,description,amount,direction,status,raw_data").order("transaction_date", { ascending: false }).limit(500),
    ]);
    const error = accountResult.error ?? statementResult.error ?? transactionResult.error;
    if (error) setNotice({ tone: "error", text: `读取数据失败：${error.message}` });
    setAccounts((accountResult.data ?? []) as Account[]);
    setStatements((statementResult.data ?? []) as Statement[]);
    setTransactions((transactionResult.data ?? []) as Tx[]);
    setSelectedAccount((current) => current || accountResult.data?.[0]?.id || "");
    setDataLoading(false);
  }, []);

  useEffect(() => {
    const client = supabase();
    client.auth.getUser().then(({ data }) => { setUser(data.user); setAuthLoading(false); });
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null); setAuthLoading(false);
    });
    return () => listener.subscription.unsubscribe();
  }, []);
  useEffect(() => { if (user) void loadData(); }, [user, loadData]);

  const currentMonthTransactions = useMemo(() => {
    const month = new Date().toISOString().slice(0, 7);
    return transactions.filter((tx) => tx.transaction_date.startsWith(month)).map((tx) => ({
      amount: Number(tx.amount), direction: tx.direction, status: tx.status,
      kind: tx.raw_data?.kind ?? tx.direction,
    }));
  }, [transactions]);
  const stats = useMemo(() => monthSummary(currentMonthTransactions), [currentMonthTransactions]);
  const reviewCount = transactions.filter((tx) => tx.status === "review").length;

  async function sendMagicLink(event: FormEvent) {
    event.preventDefault(); setBusy(true); setNotice(null);
    const { error } = await supabase().auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
    setBusy(false);
    if (error) setNotice({ tone: "error", text: `登录邮件发送失败：${error.message}` });
    else setMagicLinkSent(true);
  }

  async function addAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!user) return;
    setBusy(true); setNotice(null);
    const form = new FormData(event.currentTarget);
    const { data, error } = await supabase().from("accounts").insert({
      user_id: user.id, name: form.get("name"), institution: form.get("institution"),
      currency: form.get("currency"), account_type: form.get("account_type"),
    }).select("id,name,institution,currency,account_type").single();
    setBusy(false);
    if (error) setNotice({ tone: "error", text: `账户创建失败：${error.message}` });
    else {
      setAccounts((items) => [...items, data as Account]); setSelectedAccount(data.id); setShowAccountForm(false);
      setNotice({ tone: "success", text: "账户已创建，现在可以上传流水。" });
    }
  }

  async function uploadStatement(file: File) {
    if (!user || !selectedAccount) { setNotice({ tone: "error", text: "请先新增并选择一个银行账户。" }); return; }
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) { setNotice({ tone: "error", text: "第一版只支持文本型 PDF。" }); return; }
    setBusy(true); setNotice({ tone: "info", text: "正在读取、分类并安全上传流水…" });
    const client = supabase();
    try {
      const text = await extractPdfText(file);
      const parsed = parseCmbStatement(text);
      if (!parsed.length) throw new Error("没有识别到招商银行交易明细。请确认这是文本型 PDF，而不是扫描图片。");
      const safeName = file.name.replace(/[^\p{L}\p{N}._-]+/gu, "-");
      const storagePath = `${user.id}/${Date.now()}-${safeName}`;
      const upload = await client.storage.from("statements").upload(storagePath, file, { contentType: "application/pdf", upsert: false });
      if (upload.error) throw upload.error;
      const dates = parsed.map((row) => row.date).sort();
      const statementResult = await client.from("statements").insert({
        user_id: user.id, account_id: selectedAccount, file_name: file.name, storage_path: storagePath,
        status: "processing", period_start: dates[0], period_end: dates.at(-1),
      }).select("id").single();
      if (statementResult.error) { await client.storage.from("statements").remove([storagePath]); throw statementResult.error; }
      const fingerprints = await Promise.all(transactionFingerprintSources(selectedAccount, parsed).map(sha256));
      const existing = await client.from("transactions").select("fingerprint").in("fingerprint", fingerprints);
      if (existing.error) throw existing.error;
      const seen = new Set((existing.data ?? []).map((row) => row.fingerprint));
      const fresh = parsed.flatMap((row, index) => seen.has(fingerprints[index]) ? [] : [{
        user_id: user.id, account_id: selectedAccount, statement_id: statementResult.data.id,
        transaction_date: row.date, description: row.description, amount: row.amount,
        direction: row.direction, status: row.status, fingerprint: fingerprints[index],
        raw_data: { kind: row.kind, currency: row.currency, signed_amount: row.signedAmount, transaction_type: row.transactionType, counterparty: row.counterparty },
      }]);
      if (fresh.length) {
        const inserted = await client.from("transactions").insert(fresh);
        if (inserted.error) throw inserted.error;
      }
      const review = fresh.filter((row) => row.status === "review").length;
      await client.from("statements").update({ status: "parsed" }).eq("id", statementResult.data.id);
      setNotice({ tone: "success", text: `解析完成：识别 ${parsed.length} 笔，新增 ${fresh.length} 笔，重复 ${parsed.length - fresh.length} 笔，待确认 ${review} 笔。` });
      await loadData();
    } catch (error) {
      setNotice({ tone: "error", text: `上传失败：${error instanceof Error ? error.message : "未知错误"}` });
    } finally {
      setBusy(false); if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function confirmTransaction(id: string) {
    const { error } = await supabase().from("transactions").update({ status: "confirmed" }).eq("id", id);
    if (error) setNotice({ tone: "error", text: `确认失败：${error.message}` });
    else setTransactions((items) => items.map((tx) => tx.id === id ? { ...tx, status: "confirmed" } : tx));
  }

  if (authLoading) return <Centered><LoaderCircle className="spin"/><p>正在恢复登录状态…</p></Centered>;
  if (!user) return <main className="auth-shell"><div className="auth-card"><div className="logo">¥</div><h1>我的财务管家</h1><p>登录后，你的账户、流水和账单只对你本人可见。</p>{magicLinkSent ? <div className="sent"><Check/>登录链接已发送到 <b>{email}</b>，请打开邮件完成登录。</div> : <form onSubmit={sendMagicLink}><label>邮箱地址<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com"/></label><button className="primary" disabled={busy}>{busy ? <LoaderCircle className="spin"/> : null}发送免密码登录链接</button></form>}{notice ? <NoticeView notice={notice}/> : null}<small>使用 Supabase Auth；无需设置或保存密码。</small></div></main>;

  return <main className="app-shell"><aside><div className="brand"><div className="logo">¥</div><b>我的财务管家</b></div><nav>
    <Nav active={tab === "overview"} onClick={() => setTab("overview")}>总览</Nav><Nav active={tab === "transactions"} onClick={() => setTab("transactions")}>最近交易</Nav><Nav active={tab === "review"} onClick={() => setTab("review")}>待确认 {reviewCount ? <em>{reviewCount}</em> : null}</Nav><Nav active={tab === "accounts"} onClick={() => setTab("accounts")}>账户</Nav><Nav active={tab === "statements"} onClick={() => setTab("statements")}>账单</Nav>
  </nav><div className="privacy">🔒 数据按用户隔离<br/><small>{user.email}</small><button onClick={() => supabase().auth.signOut()}><LogOut size={14}/>退出登录</button></div></aside>
  <section className="content"><header><div><h1>{tabTitle(tab)}</h1><p>{tab === "overview" ? "真实流水，清楚归类" : "所有数据来自你的 Supabase 账户"}</p></div><div className="header-actions"><select value={selectedAccount} onChange={(event) => setSelectedAccount(event.target.value)} aria-label="选择账户"><option value="">选择账户</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select><label className={`upload ${busy ? "disabled" : ""}`}><Upload size={17}/>{busy ? "处理中…" : "上传银行流水 PDF"}<input ref={fileInput} type="file" accept="application/pdf" hidden disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadStatement(file); }}/></label></div></header>
    {notice ? <NoticeView notice={notice}/> : null}
    {!accounts.length && !dataLoading ? <div className="setup panel"><Landmark/><div><h2>先创建第一个银行账户</h2><p>流水需要归属到一个账户，之后才能正确去重和汇总。</p></div><button className="primary" onClick={() => setShowAccountForm(true)}><Plus/>新增账户</button></div> : null}
    {showAccountForm ? <AccountForm onSubmit={addAccount} onClose={() => setShowAccountForm(false)} busy={busy}/> : null}
    {dataLoading ? <Centered><LoaderCircle className="spin"/><p>正在读取财务数据…</p></Centered> : null}
    {!dataLoading && tab === "overview" ? <Overview stats={stats} transactions={transactions} reviewCount={reviewCount} setTab={setTab}/> : null}
    {!dataLoading && tab === "transactions" ? <TransactionTable transactions={transactions} empty="还没有交易，上传招商银行文本型 PDF 开始。"/> : null}
    {!dataLoading && tab === "review" ? <TransactionTable transactions={transactions.filter((tx) => tx.status === "review")} empty="没有待确认交易。" onConfirm={confirmTransaction}/> : null}
    {!dataLoading && tab === "accounts" ? <Accounts accounts={accounts} onAdd={() => setShowAccountForm(true)}/> : null}
    {!dataLoading && tab === "statements" ? <Statements statements={statements}/> : null}
  </section></main>;
}

function Nav({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <button className={active ? "active" : ""} onClick={onClick}>{children}</button>; }
function NoticeView({ notice }: { notice: NonNullable<Notice> }) { return <div className={`notice ${notice.tone}`}>{notice.tone === "success" ? <Check/> : <CircleAlert/>}<span>{notice.text}</span></div>; }
function Centered({ children }: { children: React.ReactNode }) { return <div className="centered">{children}</div>; }
function tabTitle(tab: Tab) { return ({ overview: "财务总览", transactions: "最近交易", review: "待确认", accounts: "银行账户", statements: "账单记录" })[tab]; }
function money(value: number, currency = "CNY") { return new Intl.NumberFormat("zh-CN", { style: "currency", currency }).format(value); }

function Overview({ stats, transactions, reviewCount, setTab }: { stats: ReturnType<typeof monthSummary>; transactions: Tx[]; reviewCount: number; setTab: (tab: Tab) => void }) {
  return <><div className="cards"><Card icon={<ArrowDownLeft/>} title="本月收入" value={money(stats.income)}/><Card icon={<ArrowUpRight/>} title="本月普通消费" value={money(stats.expense)}/><Card icon={<PiggyBank/>} title="本月结余" value={money(stats.balance)}/><Card icon={<WalletCards/>} title="储蓄率" value={`${stats.savingsRate}%`}/></div><div className="grid"><div className="panel"><div className="panel-title"><h2>最近交易</h2><button onClick={() => setTab("transactions")}>查看全部</button></div><TransactionTable transactions={transactions.slice(0, 6)} compact empty="上传流水后，交易会显示在这里。"/></div><div className="panel insight"><h2>分类口径</h2><p>Dashboard 只统计已确认的普通收入、利息和普通消费。资金转移、信用卡还款、理财、结售汇和取现不会误算成日常收支。</p>{reviewCount ? <button onClick={() => setTab("review")}>{reviewCount} 笔交易等待确认 →</button> : <span className="all-clear"><Check/>没有待确认交易</span>}</div></div></>;
}
function Card({ icon, title, value }: { icon: React.ReactNode; title: string; value: string }) { return <div className="card"><div>{icon}<span>{title}</span></div><strong>{value}</strong></div>; }
function TransactionTable({ transactions, empty, compact = false, onConfirm }: { transactions: Tx[]; empty: string; compact?: boolean; onConfirm?: (id: string) => void }) {
  if (!transactions.length) return <div className="empty">{empty}</div>;
  return <div className="table-wrap"><table><thead><tr><th>日期</th><th>交易</th><th>分类</th><th>状态</th><th>金额</th>{onConfirm ? <th/> : null}</tr></thead><tbody>{transactions.map((tx) => { const kind = (tx.raw_data?.kind ?? tx.direction) as TransactionKind; const currency = tx.raw_data?.currency ?? "CNY"; return <tr key={tx.id}><td className="muted">{tx.transaction_date.slice(5)}</td><td><b>{tx.description}</b>{!compact && tx.raw_data?.transaction_type ? <small>{tx.raw_data.transaction_type}</small> : null}</td><td><span className={`tag kind-${kind}`}>{kindLabels[kind]}</span></td><td><span className={tx.status === "review" ? "status warn" : "status ok"}>{tx.status === "review" ? "待确认" : "已确认"}</span></td><td className={tx.direction === "income" ? "plus amount" : tx.direction === "expense" ? "minus amount" : "muted amount"}>{tx.direction === "income" ? "+" : tx.direction === "expense" ? "−" : ""}{money(Number(tx.amount), currency)}</td>{onConfirm ? <td><button className="confirm" onClick={() => onConfirm(tx.id)}><Check/>确认</button></td> : null}</tr>; })}</tbody></table></div>;
}
function AccountForm({ onSubmit, onClose, busy }: { onSubmit: (event: FormEvent<HTMLFormElement>) => void; onClose: () => void; busy: boolean }) {
  return <div className="modal-backdrop"><form className="modal" onSubmit={onSubmit}><h2>新增银行账户</h2><label>账户名称<input name="name" required placeholder="例如：招商银行储蓄卡"/></label><label>银行<input name="institution" defaultValue="招商银行"/></label><div className="form-row"><label>币种<select name="currency" defaultValue="CNY"><option>CNY</option><option>HKD</option><option>USD</option><option>AUD</option></select></label><label>账户类型<select name="account_type" defaultValue="checking"><option value="checking">储蓄 / 活期</option><option value="credit">信用卡</option><option value="investment">投资账户</option></select></label></div><div className="modal-actions"><button type="button" onClick={onClose}>取消</button><button className="primary" disabled={busy}>保存账户</button></div></form></div>;
}
function Accounts({ accounts, onAdd }: { accounts: Account[]; onAdd: () => void }) { return <div className="panel"><div className="panel-title"><h2>我的账户</h2><button className="primary small" onClick={onAdd}><Plus/>新增账户</button></div>{accounts.length ? <div className="account-list">{accounts.map((account) => <div className="account" key={account.id}><Landmark/><div><b>{account.name}</b><span>{account.institution || "未填写银行"} · {account.currency || "CNY"}</span></div></div>)}</div> : <div className="empty">还没有账户。</div>}</div>; }
function Statements({ statements }: { statements: Statement[] }) { return <div className="panel"><h2>已上传账单</h2>{statements.length ? <div className="statement-list">{statements.map((statement) => <div className="statement" key={statement.id}><FileText/><div><b>{statement.file_name}</b><span>{statement.period_start && statement.period_end ? `${statement.period_start} 至 ${statement.period_end}` : "账期识别中"}</span></div><span className="status ok">{statement.status === "parsed" ? "已解析" : statement.status}</span></div>)}</div> : <div className="empty">还没有上传账单。</div>}</div>; }
