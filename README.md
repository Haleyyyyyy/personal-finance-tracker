# 我的财务管家

Next.js + Supabase + Vercel 的中文个人财务管理平台。

## 功能
- 固定 passcode 登录与持久 session（绑定唯一 Supabase 个人账户）
- 银行账户首次创建
- 招商银行文本型 PDF 解析（不含 OCR）
- 私有账单上传、交易 fingerprint 去重与待确认 Inbox
- 收入 / 普通消费 / 转账 / 信用卡还款 / 理财 / 结售汇 / 取现 / 利息分类
- 从真实 transactions 汇总的 Dashboard，自动排除非经营性资金流
- Supabase RLS + 按用户 ID 分区的私有 Storage

## 环境变量
复制 `.env.example` 到 `.env.local`，填写 Supabase Project URL、publishable key 和固定个人账户邮箱。旧项目也可继续使用 anon key；浏览器端绝不能使用 service role key，passcode 也绝不能写入代码或环境变量。

## 本地运行
npm install
npm run dev

## 验证
npm test
npm run typecheck
npm run build

## E2E 流程
输入固定 passcode → 新增账户 → 选择账户 → 上传招商银行文本型 PDF → 查看新增/重复/待确认摘要 → 确认模糊交易 → 查看 Dashboard。

> 不要把 Supabase service_role key 提交到 GitHub 或暴露给浏览器。


<!-- deployment refresh: Next.js preset -->

<!-- deployment refresh after Vercel output directory fix -->

<!-- deploy: verified Vercel Next.js preset -->

<!-- deploy: corrected framework preset to Next.js -->
