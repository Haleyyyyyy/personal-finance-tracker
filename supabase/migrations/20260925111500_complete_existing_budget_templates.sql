with months as (select distinct user_id,month from public.budgets), roots as (select user_id,key from public.categories where parent_id is null and type='expense')
insert into public.budgets(user_id,month,category,amount,color)
select m.user_id,m.month,r.key,
 case r.key when 'food' then 3000 when 'shopping' then 4000 when 'transportation' then 1500 when 'housing' then 6000 when 'travel' then 2500 when 'health' then 1200 when 'pets' then 1000 when 'subscriptions' then 500 when 'other' then 1800 else 1500 end,
 case r.key when 'food' then '#39765f' when 'shopping' then '#527fb2' when 'transportation' then '#4b968e' when 'housing' then '#9a795d' when 'travel' then '#6c86ad' when 'entertainment' then '#9a6bae' when 'health' then '#cf776d' when 'personal_care' then '#c98aa7' when 'pets' then '#b98652' when 'education' then '#5f7ca8' when 'subscriptions' then '#7867a8' when 'social_gifts' then '#d18b70' when 'work' then '#657681' when 'financial_fees' then '#a36b5c' when 'charity' then '#659d7c' else '#89958f' end
from months m join roots r on r.user_id=m.user_id
on conflict(user_id,month,category) do nothing;
