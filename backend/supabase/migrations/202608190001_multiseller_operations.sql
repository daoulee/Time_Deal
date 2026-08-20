-- 기존 타임딜 스키마를 멀티셀러 주문·운영 관리 구조로 안전하게 확장합니다.
-- 기존 운영 DB에서는 이 파일만 적용하고, 신규 DB에서는 통합 schema.sql을 실행합니다.
begin;

alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists preferred_region text;
alter table public.profiles add column if not exists marketing_opt_in boolean not null default false;
alter table public.profiles add column if not exists is_suspended boolean not null default false;
alter table public.pickup_locations add column if not exists updated_at timestamptz not null default now();

alter table public.products drop constraint if exists products_status_check;
alter table public.products add constraint products_status_check check(status in('draft','pending_review','active','rejected','hidden'));
alter table public.products add column if not exists rejection_reason text;
alter table public.products add column if not exists image_path text;

alter table public.orders add column if not exists payment_method text;
update public.orders set payment_method='reservation_only' where payment_method is null;
alter table public.orders alter column payment_method set not null;
alter table public.orders drop constraint if exists orders_payment_method_check;
alter table public.orders add constraint orders_payment_method_check check(payment_method in('on_site','reservation_only'));
alter table public.orders add column if not exists idempotency_key text;
create unique index if not exists orders_user_idempotency_idx on public.orders(user_id,idempotency_key) where idempotency_key is not null;
alter table public.orders drop constraint if exists orders_payment_status_check;
update public.orders set payment_status='not_applicable' where payment_status in('not_configured','pending','failed');
alter table public.orders add constraint orders_payment_status_check check(payment_status in('not_applicable','pay_on_pickup'));

create table if not exists public.fulfillment_groups(
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'pending' check(status in('pending','confirmed','ready','completed','cancelled')),
  pickup_status text not null default 'pending' check(pickup_status in('pending','ready','collected','no_show','cancelled')),
  subtotal integer not null default 0 check(subtotal>=0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(order_id,seller_id)
);
alter table public.order_items add column if not exists fulfillment_group_id uuid references public.fulfillment_groups(id) on delete restrict;
create index if not exists fulfillment_groups_seller_created_idx on public.fulfillment_groups(seller_id,created_at desc);
create index if not exists fulfillment_groups_order_idx on public.fulfillment_groups(order_id);
create index if not exists order_items_fulfillment_idx on public.order_items(fulfillment_group_id);

create table if not exists public.inventory_movements(
 id uuid primary key default gen_random_uuid(), product_id text not null references public.products(id) on delete cascade,
 seller_id uuid references public.profiles(id) on delete set null, order_item_id uuid references public.order_items(id) on delete set null,
 quantity_delta integer not null check(quantity_delta<>0), reason text not null check(reason in('order','cancel','manual','restock')),
 actor_id uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now()
);
create index if not exists inventory_movements_product_created_idx on public.inventory_movements(product_id,created_at desc);

alter table public.inquiries add column if not exists category text not null default 'general';
alter table public.inquiries add column if not exists assigned_to uuid references public.profiles(id) on delete set null;
alter table public.inquiries add column if not exists priority text not null default 'normal' check(priority in('low','normal','high','urgent'));
alter table public.inquiries add column if not exists updated_at timestamptz not null default now();
alter table public.inquiries add column if not exists closed_at timestamptz;
create table if not exists public.inquiry_messages(
 id uuid primary key default gen_random_uuid(), inquiry_id uuid not null references public.inquiries(id) on delete cascade,
 author_id uuid not null references public.profiles(id) on delete cascade, message text not null check(char_length(message) between 1 and 3000),
 is_internal boolean not null default false, created_at timestamptz not null default now()
);

alter table public.community_posts add column if not exists updated_at timestamptz not null default now();
alter table public.community_posts add column if not exists deleted_at timestamptz;
alter table public.community_posts add column if not exists visibility text not null default 'public' check(visibility in('public','hidden'));
create table if not exists public.community_comments(
 id uuid primary key default gen_random_uuid(), post_id uuid not null references public.community_posts(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade, content text not null check(char_length(content) between 1 and 2000),
 status text not null default 'visible' check(status in('visible','hidden','deleted')), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.community_reactions(
 post_id uuid not null references public.community_posts(id) on delete cascade, user_id uuid not null references public.profiles(id) on delete cascade,
 reaction text not null default 'like' check(reaction in('like')), created_at timestamptz not null default now(), primary key(post_id,user_id)
);
create table if not exists public.community_reports(
 id uuid primary key default gen_random_uuid(), post_id uuid references public.community_posts(id) on delete cascade,
 comment_id uuid references public.community_comments(id) on delete cascade, reporter_id uuid not null references public.profiles(id) on delete cascade,
 reason text not null check(char_length(reason) between 2 and 500), status text not null default 'open' check(status in('open','resolved','dismissed')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check((post_id is not null)::int+(comment_id is not null)::int=1)
);
alter table public.community_reports add column if not exists updated_at timestamptz not null default now();

alter table public.reviews add column if not exists order_item_id uuid references public.order_items(id) on delete restrict;
alter table public.reviews add column if not exists status text not null default 'visible' check(status in('visible','hidden','deleted'));
alter table public.reviews add column if not exists updated_at timestamptz not null default now();
create unique index if not exists reviews_user_order_item_idx on public.reviews(user_id,order_item_id) where order_item_id is not null;

create table if not exists public.seller_applications(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 business_name text not null, business_number text not null, status text not null default 'pending' check(status in('pending','approved','rejected')),
 review_reason text, reviewed_by uuid references public.profiles(id) on delete set null, reviewed_at timestamptz, created_at timestamptz not null default now(), unique(user_id)
);
create table if not exists public.audit_logs(
 id bigint generated always as identity primary key, actor_id uuid references public.profiles(id) on delete set null,
 action text not null, entity_type text not null, entity_id text, before_data jsonb, after_data jsonb, reason text,
 created_at timestamptz not null default now()
);
create index if not exists audit_logs_created_idx on public.audit_logs(created_at desc);

alter table public.fulfillment_groups enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.inquiry_messages enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_reactions enable row level security;
alter table public.community_reports enable row level security;
alter table public.seller_applications enable row level security;
alter table public.audit_logs enable row level security;

create index if not exists products_seller_status_idx on public.products(seller_id,status);
alter table public.deals add column if not exists updated_at timestamptz not null default now();
create index if not exists deals_product_status_time_idx on public.deals(product_id,status,ends_at);
create index if not exists pickup_slots_location_active_time_idx on public.pickup_slots(location_id,is_active,pickup_at);
create index if not exists inquiries_assigned_status_created_idx on public.inquiries(assigned_to,status,created_at desc);
create index if not exists inquiries_user_status_created_idx on public.inquiries(user_id,status,created_at desc);
create index if not exists community_posts_status_created_idx on public.community_posts(status,created_at desc);

create or replace function public.create_order_atomic(
 p_actor_id uuid, p_pickup_location_id uuid, p_pickup_slot_id uuid, p_payment_method text, p_idempotency_key text, p_items jsonb
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_slot public.pickup_slots%rowtype; v_item jsonb; v_product public.products%rowtype; v_deal public.deals%rowtype;
 v_order public.orders%rowtype; v_group_id uuid; v_order_item_id uuid; v_quantity int; v_unit_price int; v_subtotal int:=0; v_count int:=0;
begin
 if p_actor_id is null or not exists(select 1 from public.profiles where id=p_actor_id and not is_suspended) then raise exception using errcode='42501',message='유효한 주문 사용자만 주문할 수 있습니다.'; end if;
 if p_payment_method not in('on_site','reservation_only') then raise exception using errcode='22023',message='주문 방식을 확인하세요.'; end if;
 if p_idempotency_key is null or char_length(p_idempotency_key) not between 8 and 120 then raise exception using errcode='22023',message='멱등성 키를 확인하세요.'; end if;
 select * into v_order from public.orders where user_id=p_actor_id and idempotency_key=p_idempotency_key;
 if found then return jsonb_build_object('order_id',v_order.id,'order',to_jsonb(v_order),'replayed',true); end if;
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception using errcode='22023',message='주문 상품이 없습니다.'; end if;
 if (select count(*) from (select value->>'product_id' from jsonb_array_elements(p_items) group by 1 having count(*)>1)s)>0 then raise exception using errcode='22023',message='같은 상품은 한 번만 담아 주세요.'; end if;
 select * into v_slot from public.pickup_slots where id=p_pickup_slot_id and location_id=p_pickup_location_id and is_active and pickup_at>now() for update;
 if not found then raise exception using errcode='P0001',message='선택한 픽업 슬롯을 사용할 수 없습니다.'; end if;
 for v_item in select value from jsonb_array_elements(p_items) loop
  v_quantity:=(v_item->>'quantity')::int; if v_quantity not between 1 and 20 then raise exception using errcode='22023',message='상품 수량이 올바르지 않습니다.'; end if;
  select * into v_product from public.products where id=v_item->>'product_id' and status='active' and seller_id is not null for update;
  if not found or v_product.inventory<v_quantity then raise exception using errcode='P0001',message='판매 상품 또는 재고를 확인하세요.'; end if;
  v_unit_price:=v_product.regular_price;
  if nullif(v_item->>'deal_id','') is not null then select * into v_deal from public.deals where id=v_item->>'deal_id' and product_id=v_product.id and status='active' and starts_at<=now() and ends_at>now() for update; if not found then raise exception using errcode='P0001',message='활성 타임딜을 찾을 수 없습니다.'; end if; v_unit_price:=v_deal.deal_price; end if;
  v_subtotal:=v_subtotal+v_unit_price*v_quantity; v_count:=v_count+v_quantity;
 end loop;
 if v_slot.reserved_count+v_count>v_slot.capacity then raise exception using errcode='P0001',message='픽업 슬롯 정원이 가득 찼습니다.'; end if;
 insert into public.orders(user_id,pickup_location_id,pickup_slot_id,subtotal,total_amount,order_status,payment_status,pickup_status,payment_method,idempotency_key)
 values(p_actor_id,p_pickup_location_id,p_pickup_slot_id,v_subtotal,v_subtotal,'pending',case when p_payment_method='on_site' then 'pay_on_pickup' else 'not_applicable' end,'pending',p_payment_method,p_idempotency_key) returning * into v_order;
 for v_item in select value from jsonb_array_elements(p_items) loop
  v_quantity:=(v_item->>'quantity')::int; select * into v_product from public.products where id=v_item->>'product_id'; v_unit_price:=v_product.regular_price;
  if nullif(v_item->>'deal_id','') is not null then select * into v_deal from public.deals where id=v_item->>'deal_id'; v_unit_price:=v_deal.deal_price; end if;
  insert into public.fulfillment_groups(order_id,seller_id,subtotal) values(v_order.id,v_product.seller_id,v_unit_price*v_quantity)
   on conflict(order_id,seller_id) do update set subtotal=public.fulfillment_groups.subtotal+excluded.subtotal returning id into v_group_id;
  insert into public.order_items(order_id,fulfillment_group_id,product_id,deal_id,product_name,unit_price,quantity,line_total)
   values(v_order.id,v_group_id,v_product.id,nullif(v_item->>'deal_id',''),v_product.name,v_unit_price,v_quantity,v_unit_price*v_quantity) returning id into v_order_item_id;
  update public.products set inventory=inventory-v_quantity,updated_at=now() where id=v_product.id;
  insert into public.inventory_movements(product_id,seller_id,order_item_id,quantity_delta,reason,actor_id) values(v_product.id,v_product.seller_id,v_order_item_id,-v_quantity,'order',p_actor_id);
  if nullif(v_item->>'deal_id','') is not null then update public.deals set participants=participants+v_quantity where id=v_item->>'deal_id' and participants+v_quantity<=target; if not found then raise exception using errcode='P0001',message='타임딜 목표 수량을 초과했습니다.'; end if; insert into public.participations(user_id,deal_id,quantity,status) values(p_actor_id,v_item->>'deal_id',v_quantity,'ordered'); end if;
 end loop;
 update public.pickup_slots set reserved_count=reserved_count+v_count where id=v_slot.id;
 return jsonb_build_object('order_id',v_order.id,'order',to_jsonb(v_order),'replayed',false);
end $$;

create or replace function public.cancel_order_atomic(p_order_id uuid,p_actor_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_order public.orders%rowtype; v_role public.app_role; v_item record; v_result public.orders%rowtype;
begin
 select role into v_role from public.profiles where id=p_actor_id;
 select * into v_order from public.orders where id=p_order_id for update;
 if not found then raise exception using errcode='P0001',message='주문을 찾을 수 없습니다.'; end if;
 if v_role is distinct from 'admin' and v_order.user_id<>p_actor_id then raise exception using errcode='42501',message='주문 소유자만 취소할 수 있습니다.'; end if;
 if v_order.order_status not in('pending','confirmed','ready') then raise exception using errcode='P0001',message='현재 주문 상태에서는 취소할 수 없습니다.'; end if;
 for v_item in select * from public.order_items where order_id=v_order.id loop
  update public.products set inventory=inventory+v_item.quantity,updated_at=now() where id=v_item.product_id;
  insert into public.inventory_movements(product_id,seller_id,order_item_id,quantity_delta,reason,actor_id) select v_item.product_id,p.seller_id,v_item.id,v_item.quantity,'cancel',p_actor_id from public.products p where p.id=v_item.product_id;
  if v_item.deal_id is not null then update public.deals set participants=greatest(0,participants-v_item.quantity) where id=v_item.deal_id; update public.participations set status='cancelled' where user_id=v_order.user_id and deal_id=v_item.deal_id and status='ordered'; end if;
 end loop;
 update public.pickup_slots set reserved_count=greatest(0,reserved_count-(select coalesce(sum(quantity),0) from public.order_items where order_id=v_order.id)) where id=v_order.pickup_slot_id;
 update public.fulfillment_groups set status='cancelled',pickup_status='cancelled',updated_at=now() where order_id=v_order.id;
 update public.orders set order_status='cancelled',pickup_status='cancelled',cancelled_at=now(),updated_at=now() where id=v_order.id returning * into v_result;
 return jsonb_build_object('order',to_jsonb(v_result));
end $$;

revoke all on function public.create_order_atomic(uuid,uuid,uuid,text,text,jsonb) from public,anon,authenticated;
revoke all on function public.cancel_order_atomic(uuid,uuid) from public,anon,authenticated;
grant execute on function public.create_order_atomic(uuid,uuid,uuid,text,text,jsonb) to service_role;
grant execute on function public.cancel_order_atomic(uuid,uuid) to service_role;
commit;
