# 我的财务管家

Next.js + Supabase + Vercel 的中文个人财务管理平台。

## 功能
- 财务 Dashboard
- accounts / transactions / categories / statements 数据模型
- PDF 银行流水上传入口
- 待确认交易 Inbox
- 内部转账设计
- Supabase RLS + 私有 Storage

## 环境变量
复制 .env.example 到 .env.local，填写 Supabase Project URL 与 anon/publishable key。

## 本地运行
npm install
npm run dev

> 不要把 Supabase service_role key 提交到 GitHub 或暴露给浏览器。


<!-- deployment refresh: Next.js preset -->
