# 我的财务管家

Next.js + Supabase + Vercel 的中文个人财务管理平台。

## 功能
- Supabase 邮箱 Magic Link 登录与持久 session
- 银行账户首次创建
- 招商银行文本型 PDF 解析（不含 OCR）
- 私有账单上传、交易 fingerprint 去重与待确认 Inbox
- 收入 / 普通消费 / 转账 / 信用卡还款 / 理财 / 结售汇 / 取现 / 利息分类
- 从真实 transactions 汇总的 Dashboard，自动排除非经营性资金流
- Supabase RLS + 按用户 ID 分区的私有 Storage

## 环境变量
复制 `.env.example` 到 `.env.local`，填写 Supabase Project URL 与 publishable key。旧项目也可继续使用 anon key；浏览器端绝不能使用 service role key。

## 本地运行
npm install
npm run dev

## 验证
npm test
npm run typecheck
npm run build

## E2E 流程
邮箱登录 → 新增账户 → 选择账户 → 上传招商银行文本型 PDF → 查看新增/重复/待确认摘要 → 确认模糊交易 → 查看 Dashboard。

首次使用 Magic Link 前，请在 Supabase Auth 的 URL Configuration 中把生产域名加入 Redirect URLs。

> 不要把 Supabase service_role key 提交到 GitHub 或暴露给浏览器。


<!-- deployment refresh: Next.js preset -->

<!-- deployment refresh after Vercel output directory fix -->

<!-- deploy: verified Vercel Next.js preset -->

<!-- deploy: corrected framework preset to Next.js -->
