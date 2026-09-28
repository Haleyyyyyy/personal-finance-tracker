-- Unify transaction flow, category hierarchy and the ten-category budget model without deleting financial records.
alter table public.categories add column if not exists budget_enabled boolean not null default false;
alter table public.categories add column if not exists is_active boolean not null default true;
alter table public.categories drop constraint if exists categories_type_check;
alter table public.categories add constraint categories_type_check check(type in('income','expense','investment','transfer','fx','cash','review'));

alter table public.transactions drop constraint if exists transactions_transaction_type_check;
update public.transactions set transaction_type='income',direction='income' where transaction_type='interest';
update public.transactions set transaction_type='transfer',direction='transfer' where transaction_type='card_repayment';
alter table public.transactions add constraint transactions_transaction_type_check check(transaction_type in('income','expense','investment','transfer','fx','cash','review'));

with roots(key,name,type,budget_enabled) as (values
 ('salary','工资','income',false),('bonus','奖金','income',false),('interest','利息','income',false),('investment_income','投资收益','income',false),('reimbursement','报销','income',false),('gift_income','礼金收入','income',false),('refund','退款','income',false),('other_income','其他收入','income',false),
 ('food','餐饮','expense',true),('entertainment','娱乐','expense',true),('pets','宠物','expense',true),('shopping','购物','expense',true),('education','教育','expense',true),('other','其他','expense',true),('housing','住房','expense',true),('travel','旅行','expense',true),('insurance','保险','expense',true),('household','家用','expense',true),
 ('wealth_management','理财','investment',false),('credit_card_repayment','信用卡还款','transfer',false),('internal_transfer','内部转账','transfer',false),('currency_exchange','货币兑换','fx',false),('cash_change','现金变动','cash',false)
)
insert into public.categories(user_id,key,name,type,system,budget_enabled,is_active)
select u.id,r.key,r.name,r.type,true,r.budget_enabled,true from auth.users u cross join roots r
on conflict(user_id,key) where parent_id is null do update set name=excluded.name,type=excluded.type,system=true,budget_enabled=excluded.budget_enabled,is_active=true,updated_at=now();

-- Child keys changed in this taxonomy. Keep the rows for audit, then reactivate only canonical children below.
update public.categories set is_active=false,updated_at=now() where parent_id is not null;

with defs(parent_key,key,name) as (values
 ('food','restaurant','正餐'),('food','coffee_tea','咖啡茶饮'),('food','delivery','外卖'),('food','convenience_store','便利店'),('food','snacks','零食'),('food','groceries','食品采购'),('food','other_food','其他餐饮'),
 ('entertainment','movie','电影'),('entertainment','concert','演出'),('entertainment','games','游戏'),('entertainment','events','活动'),('entertainment','ktv_party','聚会'),('entertainment','hobbies','兴趣'),('entertainment','other_entertainment','其他娱乐'),
 ('pets','pet_food','宠物食品'),('pets','pet_supplies','宠物用品'),('pets','pet_medical','宠物医疗'),('pets','pet_grooming','宠物美容'),('pets','pet_services','宠物服务'),('pets','other_pets','其他宠物'),
 ('shopping','clothing','服饰'),('shopping','beauty','美妆'),('shopping','jewelry_luxury','珠宝奢侈品'),('shopping','electronics','电子产品'),('shopping','online_shopping','网购'),('shopping','other_shopping','其他购物'),
 ('education','courses','课程'),('education','books','书籍'),('education','exams','考试'),('education','language_learning','语言学习'),('education','professional_training','职业培训'),('education','other_education','其他教育'),
 ('other','transportation','交通'),('other','health','健康'),('other','subscriptions','订阅'),('other','work','工作'),('other','charity','公益捐赠'),('other','financial_fees','金融费用'),('other','personal_care','个人护理'),('other','miscellaneous','其他杂项'),
 ('housing','rent','房租'),('housing','mortgage','房贷'),('housing','property_management','物业'),('housing','utilities','水电煤'),('housing','internet_telecom','网络通讯'),('housing','home_repair','房屋维修'),('housing','other_housing','其他住房'),
 ('travel','flights','机票'),('travel','rail','铁路'),('travel','hotel','酒店'),('travel','local_transport','当地交通'),('travel','attractions','景点门票'),('travel','tours_activities','旅行活动'),('travel','visa','签证'),('travel','travel_insurance','旅行保险'),('travel','car_rental','租车'),('travel','other_travel','其他旅行'),
 ('insurance','medical_insurance','医疗保险'),('insurance','life_insurance','人寿保险'),('insurance','travel_insurance','旅行保险'),('insurance','vehicle_insurance','车辆保险'),('insurance','property_insurance','财产保险'),('insurance','other_insurance','其他保险'),
 ('household','daily_necessities','日用品'),('household','cleaning_supplies','清洁用品'),('household','kitchen_supplies','厨房用品'),('household','home_supplies','家居用品'),('household','small_appliances','小家电'),('household','other_household','其他家用'),
 ('wealth_management','subscription','申购'),('wealth_management','redemption','赎回'),('cash_change','withdrawal','取现'),('cash_change','deposit','存现')
), parents as (select c.id,c.user_id,c.key,c.type from public.categories c where c.parent_id is null)
insert into public.categories(user_id,key,name,type,parent_id,system,budget_enabled,is_active)
select p.user_id,d.key,d.name,p.type,p.id,true,false,true from defs d join parents p on p.key=d.parent_key
on conflict(user_id,parent_id,key) where parent_id is not null do update set name=excluded.name,type=excluded.type,system=true,is_active=true,updated_at=now();

-- Preserve the meaning of legacy children whose stable keys changed.
with key_map(parent_key,old_key,new_key) as (values
 ('food','alcohol','other_food'),('shopping','home_goods','other_shopping'),('shopping','daily_goods','other_shopping'),
 ('entertainment','performance','concert'),('entertainment','gaming','games'),('entertainment','hobby_activity','hobbies'),
 ('pets','pet_service','pet_services'),('education','course','courses'),('education','exam','exams'),('education','training','professional_training'),
 ('housing','internet_mobile','internet_telecom'),('housing','furniture_appliances','other_housing'),
 ('travel','flight','flights'),('travel','tour_activity','tours_activities'),('travel','visa_insurance','other_travel')
), remap as (
 select t.id,new_child.id subcategory_id from public.transactions t
 join public.categories parent on parent.id=t.category_id
 join public.categories old_child on old_child.id=t.subcategory_id
 join key_map m on m.parent_key=parent.key and m.old_key=old_child.key
 join public.categories new_child on new_child.parent_id=parent.id and new_child.key=m.new_key
) update public.transactions t set subcategory_id=remap.subcategory_id from remap where t.id=remap.id;

-- Assign non-expense flows. Only classification columns change; source, notes, tags and FX columns are untouched.
update public.transactions t set category_id=c.id,subcategory_id=null
from public.categories c where c.user_id=t.user_id and c.parent_id is null and c.key='interest' and t.transaction_type='income' and coalesce(t.raw_data->>'kind','')='interest';
update public.transactions t set category_id=c.id,subcategory_id=null
from public.categories c where c.user_id=t.user_id and c.parent_id is null and c.key=case when t.description ~* '代发|工资|薪资' then 'salary' when t.description ~* '奖金|bonus' then 'bonus' when t.description ~* '报销' then 'reimbursement' else 'other_income' end and t.transaction_type='income' and t.category_id is null;
update public.transactions t set category_id=c.id,subcategory_id=(select s.id from public.categories s where s.parent_id=c.id and s.key=case when t.description ~* '赎回|卖出|出金' then 'redemption' else 'subscription' end)
from public.categories c where c.user_id=t.user_id and c.parent_id is null and c.key='wealth_management' and t.transaction_type='investment';
update public.transactions t set category_id=c.id,subcategory_id=null from public.categories c where c.user_id=t.user_id and c.parent_id is null and c.key='credit_card_repayment' and t.transaction_type='transfer' and coalesce(t.raw_data->>'kind','')='credit_card_repayment';
update public.transactions t set category_id=c.id,subcategory_id=null from public.categories c where c.user_id=t.user_id and c.parent_id is null and c.key='internal_transfer' and t.transaction_type='transfer' and t.category_id is null;
update public.transactions t set category_id=c.id,subcategory_id=null from public.categories c where c.user_id=t.user_id and c.parent_id is null and c.key='currency_exchange' and t.transaction_type='fx';
update public.transactions t set category_id=c.id,subcategory_id=(select s.id from public.categories s where s.parent_id=c.id and s.key=case when t.description ~* '存现|现金存入' then 'deposit' else 'withdrawal' end) from public.categories c where c.user_id=t.user_id and c.parent_id is null and c.key='cash_change' and t.transaction_type='cash';

-- Roll retired expense roots into the final hierarchy.
update public.transactions t set category_id=new_parent.id,subcategory_id=new_sub.id
from public.categories old_parent join public.categories new_parent on new_parent.user_id=old_parent.user_id and new_parent.parent_id is null and new_parent.key='other'
join public.categories new_sub on new_sub.parent_id=new_parent.id and new_sub.key=case old_parent.key when 'transportation' then 'transportation' when 'health' then 'health' when 'subscriptions' then 'subscriptions' when 'work' then 'work' when 'charity' then 'charity' when 'financial_fees' then 'financial_fees' when 'personal_care' then 'personal_care' else 'miscellaneous' end
where t.category_id=old_parent.id and old_parent.key in('transportation','health','subscriptions','work','charity','financial_fees','personal_care','social_gifts');

-- Tourism aliases merge into Travel while retaining only reliable subcategory meaning.
with remap as (
 select t.id,travel.id category_id,coalesce(mapped.id,other_travel.id) subcategory_id
 from public.transactions t join public.categories old_parent on old_parent.id=t.category_id
 join public.categories travel on travel.user_id=old_parent.user_id and travel.parent_id is null and travel.key='travel'
 join public.categories other_travel on other_travel.parent_id=travel.id and other_travel.key='other_travel'
 left join public.categories old_sub on old_sub.id=t.subcategory_id
 left join public.categories mapped on mapped.parent_id=travel.id and mapped.key=case old_sub.key when 'attraction' then 'attractions' when 'attractions' then 'attractions' when 'activity' then 'tours_activities' when 'tour_activity' then 'tours_activities' when 'hotel' then 'hotel' when 'rail' then 'rail' when 'flight' then 'flights' when 'local_transport' then 'local_transport' when 'car_rental' then 'car_rental' else null end
 where old_parent.key='tourism'
) update public.transactions t set category_id=remap.category_id,subcategory_id=remap.subcategory_id from remap where t.id=remap.id;

-- High-confidence historical insurance and household migrations only.
update public.transactions t set category_id=p.id,subcategory_id=s.id from public.categories p join public.categories s on s.parent_id=p.id and s.key='other_insurance' where p.user_id=t.user_id and p.parent_id is null and p.key='insurance' and t.transaction_type='expense' and t.description ~* '保险公司|保险费|policy premium';
update public.transactions t set category_id=p.id,subcategory_id=s.id from public.categories p join public.categories s on s.parent_id=p.id and s.key='cleaning_supplies' where p.user_id=t.user_id and p.parent_id is null and p.key='household' and t.transaction_type='expense' and t.description ~* '洗衣液|清洁用品|纸巾';

-- Ensure every remaining expense points to an active final parent; preserve valid final roots.
update public.transactions t set category_id=p.id,subcategory_id=s.id from public.categories p join public.categories s on s.parent_id=p.id and s.key='miscellaneous' where p.user_id=t.user_id and p.parent_id is null and p.key='other' and t.transaction_type='expense' and not exists(select 1 from public.categories current where current.id=t.category_id and current.parent_id is null and current.key in('food','entertainment','pets','shopping','education','other','housing','travel','insurance','household'));

-- No transaction may retain an inactive child. Fall back to the parent's explicit "other" child.
with fallback(parent_key,child_key) as (values
 ('food','other_food'),('entertainment','other_entertainment'),('pets','other_pets'),('shopping','other_shopping'),
 ('education','other_education'),('other','miscellaneous'),('housing','other_housing'),('travel','other_travel'),
 ('insurance','other_insurance'),('household','other_household')
), remap as (
 select t.id,child.id subcategory_id from public.transactions t
 join public.categories parent on parent.id=t.category_id
 join public.categories old_child on old_child.id=t.subcategory_id and not old_child.is_active
 join fallback f on f.parent_key=parent.key
 join public.categories child on child.parent_id=parent.id and child.key=f.child_key and child.is_active
) update public.transactions t set subcategory_id=remap.subcategory_id from remap where t.id=remap.id;

-- Deactivate retired roots but retain rows for audit/history.
update public.categories set is_active=false,budget_enabled=false,updated_at=now() where parent_id is null and key in('transportation','health','subscriptions','work','charity','financial_fees','personal_care','social_gifts','tourism');

-- Merge historical budgets by month without losing amounts. Canonical rows retain their IDs.
with mapped as (
 select user_id,month,case when category in('transportation','health','subscriptions','work','charity','financial_fees','personal_care','social_gifts') then 'other' when category='tourism' then 'travel' else category end category,sum(amount) amount,min(color) color
 from public.budgets group by user_id,month,case when category in('transportation','health','subscriptions','work','charity','financial_fees','personal_care','social_gifts') then 'other' when category='tourism' then 'travel' else category end
)
insert into public.budgets(user_id,month,category,amount,color)
select user_id,month,category,amount,color from mapped
on conflict(user_id,month,category) do update set amount=excluded.amount,updated_at=now();
delete from public.budgets where category in('transportation','health','subscriptions','work','charity','financial_fees','personal_care','social_gifts','tourism');
