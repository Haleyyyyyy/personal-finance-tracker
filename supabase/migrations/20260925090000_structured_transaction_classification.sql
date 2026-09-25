alter table public.categories add column if not exists key text;
alter table public.categories add column if not exists parent_id uuid references public.categories(id) on delete cascade;
alter table public.categories add column if not exists system boolean not null default false;
alter table public.categories add column if not exists updated_at timestamptz not null default now();
create unique index if not exists categories_user_root_key_unique on public.categories(user_id,key) where parent_id is null;
create unique index if not exists categories_user_parent_key_unique on public.categories(user_id,parent_id,key) where parent_id is not null;
create index if not exists categories_user_id_idx on public.categories(user_id);
create index if not exists categories_parent_id_idx on public.categories(parent_id);

alter table public.transactions add column if not exists transaction_type text;
alter table public.transactions add column if not exists subcategory_id uuid references public.categories(id) on delete set null;
alter table public.transactions add column if not exists classification_status text;
alter table public.transactions add column if not exists classification_confidence numeric(4,3);
alter table public.transactions drop constraint if exists transactions_transaction_type_check;
alter table public.transactions add constraint transactions_transaction_type_check check(transaction_type in('income','expense','transfer','card_repayment','investment','fx','cash','interest','review'));
alter table public.transactions drop constraint if exists transactions_classification_status_check;
alter table public.transactions add constraint transactions_classification_status_check check(classification_status in('confirmed','review'));
create index if not exists transactions_user_type_date_idx on public.transactions(user_id,transaction_type,transaction_date desc);
create index if not exists transactions_category_id_idx on public.transactions(category_id);
create index if not exists transactions_subcategory_id_idx on public.transactions(subcategory_id);

create table if not exists public.tags(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(length(trim(name)) between 1 and 60),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create unique index if not exists tags_user_name_unique on public.tags(user_id,lower(name));
create index if not exists tags_user_id_idx on public.tags(user_id);
alter table public.tags enable row level security;
drop policy if exists "own tags" on public.tags;
create policy "own tags" on public.tags for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
grant select,insert,update,delete on public.tags to authenticated;

create table if not exists public.transaction_tags(
 transaction_id uuid not null references public.transactions(id) on delete cascade,
 tag_id uuid not null references public.tags(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(transaction_id,tag_id)
);
create index if not exists transaction_tags_user_id_idx on public.transaction_tags(user_id);
create index if not exists transaction_tags_tag_id_idx on public.transaction_tags(tag_id);
alter table public.transaction_tags enable row level security;
drop policy if exists "own transaction tags" on public.transaction_tags;
create policy "own transaction tags" on public.transaction_tags for all to authenticated
 using((select auth.uid())=user_id and exists(select 1 from public.transactions t where t.id=transaction_id and t.user_id=(select auth.uid())) and exists(select 1 from public.tags g where g.id=tag_id and g.user_id=(select auth.uid())))
 with check((select auth.uid())=user_id and exists(select 1 from public.transactions t where t.id=transaction_id and t.user_id=(select auth.uid())) and exists(select 1 from public.tags g where g.id=tag_id and g.user_id=(select auth.uid())));
grant select,insert,update,delete on public.transaction_tags to authenticated;
grant select,insert,update,delete on public.categories to authenticated;
grant select,update on public.transactions to authenticated;

with defs(key,name) as (values
 ('food','餐饮'),('shopping','购物'),('transportation','交通'),('housing','住房'),('travel','旅行'),('entertainment','娱乐'),('health','健康'),('personal_care','个人护理'),('pets','宠物'),('education','教育'),('subscriptions','订阅 / 数字服务'),('social_gifts','社交 / 礼物'),('work','工作'),('financial_fees','税费 / 金融费用'),('charity','公益 / 捐赠'),('other','其他')
)
insert into public.categories(user_id,key,name,type,system)
select u.id,d.key,d.name,'expense',true from auth.users u cross join defs d
on conflict(user_id,key) where parent_id is null do update set name=excluded.name,system=true,updated_at=now();

with defs(parent_key,key,name) as (values
 ('food','restaurant','正餐'),('food','coffee_tea','咖啡 / 茶饮'),('food','delivery','外卖'),('food','snacks','零食'),('food','convenience_store','便利店'),('food','alcohol','酒水'),('food','other_food','其他餐饮'),
 ('shopping','clothing','服饰'),('shopping','beauty','美妆'),('shopping','jewelry_luxury','珠宝 / 奢侈品'),('shopping','electronics','电子产品'),('shopping','home_goods','家居'),('shopping','daily_goods','日用品'),('shopping','online_shopping','网购'),('shopping','other_shopping','其他购物'),
 ('transportation','public_transit','公交 / 地铁'),('transportation','taxi','打车'),('transportation','rail','铁路'),('transportation','flight','机票'),('transportation','fuel','加油'),('transportation','parking','停车'),('transportation','car_rental','租车'),('transportation','other_transportation','其他交通'),
 ('housing','rent','房租'),('housing','mortgage','房贷'),('housing','property_management','物业'),('housing','utilities','水电煤'),('housing','internet_mobile','网络 / 通讯'),('housing','home_repair','家庭维修'),('housing','furniture_appliances','家具 / 家电'),('housing','other_housing','其他住房'),
 ('travel','hotel','酒店'),('travel','attractions','景点 / 门票'),('travel','local_transport','当地交通'),('travel','tour_activity','旅行团 / 活动'),('travel','visa_insurance','签证 / 保险'),('travel','other_travel','其他旅行'),
 ('entertainment','movie','电影'),('entertainment','performance','演出'),('entertainment','gaming','游戏'),('entertainment','hobby_activity','兴趣 / 活动'),('entertainment','ktv_party','KTV / 聚会'),('entertainment','other_entertainment','其他娱乐'),
 ('health','medical','医疗'),('health','medicine','药品'),('health','checkup','体检'),('health','fitness','健身'),('health','dental','牙科'),('health','health_insurance','保险相关健康支出'),('health','other_health','其他健康'),
 ('personal_care','haircut','理发'),('personal_care','beauty_care','美容'),('personal_care','nails','美甲'),('personal_care','spa','SPA'),('personal_care','skin_care','护肤护理'),('personal_care','other_personal_care','其他个人护理'),
 ('pets','pet_food','宠物食品'),('pets','pet_supplies','宠物用品'),('pets','pet_medical','宠物医疗'),('pets','pet_grooming','宠物美容'),('pets','pet_service','宠物服务'),('pets','other_pets','其他宠物'),
 ('education','course','课程'),('education','books','书籍'),('education','exam','考试'),('education','language_learning','语言学习'),('education','training','培训'),('education','other_education','其他教育'),
 ('subscriptions','ai_service','AI 服务'),('subscriptions','streaming','流媒体'),('subscriptions','cloud_storage','云存储'),('subscriptions','software','软件'),('subscriptions','app_subscription','App 订阅'),('subscriptions','membership','会员'),('subscriptions','other_digital','其他数字服务'),
 ('social_gifts','gift','礼物'),('social_gifts','red_packet','红包'),('social_gifts','treating','请客'),('social_gifts','social_obligation','人情'),('social_gifts','wedding_event','婚礼 / 活动'),('social_gifts','other_social','其他社交'),
 ('work','office_supplies','办公用品'),('work','business_travel','工作差旅'),('work','professional_training','职业培训'),('work','work_meal','工作餐'),('work','reimbursable','可报销费用'),('work','other_work','其他工作'),
 ('financial_fees','tax','税'),('financial_fees','bank_fee','银行手续费'),('financial_fees','credit_card_fee','信用卡费用'),('financial_fees','remittance_fee','汇款手续费'),('financial_fees','fx_fee','外汇手续费'),('financial_fees','other_financial_fee','其他金融费用'),
 ('charity','charity_donation','慈善捐款'),('charity','animal_charity','动物公益'),('charity','public_welfare','公益项目'),('charity','other_donation','其他捐赠'),
 ('other','uncategorized','未分类消费'),('other','other','其他')
)
insert into public.categories(user_id,parent_id,key,name,type,system)
select p.user_id,p.id,d.key,d.name,'expense',true from public.categories p join defs d on d.parent_key=p.key where p.parent_id is null
on conflict(user_id,parent_id,key) where parent_id is not null do update set name=excluded.name,system=true,updated_at=now();

update public.transactions set
 transaction_type=case coalesce(raw_data->>'kind',direction)
  when 'income' then 'income' when 'expense' then 'expense' when 'transfer' then 'transfer' when 'credit_card_repayment' then 'card_repayment' when 'investment' then 'investment' when 'fx' then 'fx' when 'cash_withdrawal' then 'cash' when 'interest' then 'interest' else 'review' end,
 classification_status=case when status='confirmed' then 'confirmed' else 'review' end,
 classification_confidence=case when status='confirmed' then .900 else .500 end
where transaction_type is null;

update public.transactions t set transaction_type='review',classification_status='review',classification_confidence=.350
where transaction_type='expense' and (t.description ilike '%微信转账%') and status='review';

update public.transactions t set category_id=c.id
from public.categories c
where t.user_id=c.user_id and c.parent_id is null and t.transaction_type='expense' and c.key=case
 when t.description ~* 'UNIQLO|优衣库|银座|商场|京东|淘宝|LOFT|PARCO|MATSUYA|MIKIMOTO' then 'shopping'
 when t.description ~* 'FamilyMart|全家|7-Eleven|便利店|餐|咖啡|茶|饮品|美团|饿了么' then 'food'
 when t.description ~* '宠物' then 'pets'
 when t.description ~* 'ChatGPT|OpenAI|iCloud|Netflix|Spotify' then 'subscriptions'
 when t.description ~* '滴滴|地铁|铁路|航空|机场|打车|公交|加油' then 'transportation'
 when t.description ~* '医院|药房|诊所|体检' then 'health'
 when t.description ~* '电影|游戏|娱乐|演出' then 'entertainment'
 when t.description ~* '旅行|酒店|宾馆' then 'travel'
 else coalesce(case t.raw_data->>'budget_category' when '餐饮' then 'food' when '购物' then 'shopping' when '交通' then 'transportation' when '健康' then 'health' when '娱乐' then 'entertainment' else 'other' end,'other') end;

update public.transactions t set subcategory_id=s.id
from public.categories s join public.categories p on p.id=s.parent_id
where t.user_id=s.user_id and t.category_id=p.id and s.key=case
 when t.description ~* 'UNIQLO|优衣库' then 'clothing'
 when t.description ~* 'FamilyMart|全家|7-Eleven|便利店' then 'convenience_store'
 when t.description ~* '宠物用品' then 'pet_supplies'
 when t.description ~* 'ChatGPT|OpenAI' then 'ai_service'
 when t.description ~* 'iCloud' then 'cloud_storage'
 when t.description ~* 'Netflix|Spotify' then 'streaming'
 when t.description ~* '药房|药店|Pharmacy' then 'medicine'
 when t.description ~* '医院|诊所' then 'medical'
 when t.description ~* '地铁|公交' then 'public_transit'
 when t.description ~* '滴滴|出租|打车' then 'taxi'
 when t.description ~* '酒店|宾馆' then 'hotel'
 else case p.key when 'food' then 'other_food' when 'shopping' then 'other_shopping' when 'transportation' then 'other_transportation' when 'health' then 'other_health' when 'entertainment' then 'other_entertainment' when 'travel' then 'other_travel' when 'pets' then 'other_pets' when 'subscriptions' then 'other_digital' else 'uncategorized' end end;

update public.budgets set category=case category when '餐饮' then 'food' when '购物' then 'shopping' when '交通' then 'transportation' when '健康' then 'health' when '娱乐' then 'entertainment' when '宠物' then 'pets' when '订阅' then 'subscriptions' when '其他' then 'other' else category end;
