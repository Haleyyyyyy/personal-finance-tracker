update public.transactions
set raw_data=jsonb_set(coalesce(raw_data,'{}'::jsonb),'{original_description}',to_jsonb(description),true)
where not (coalesce(raw_data,'{}'::jsonb) ? 'original_description');
