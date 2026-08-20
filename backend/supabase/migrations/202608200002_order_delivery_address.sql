-- 2026-08-20 주문 시 수령 주소(배송지) 입력 기능
-- 주문자가 직접 입력하거나 GPS로 조회한 주소를 주문에 함께 저장합니다. 기존 픽업 장소/슬롯 선택 흐름은 그대로 유지합니다.
begin;

alter table public.orders add column if not exists delivery_address text;

create or replace function public.create_order_atomic(
 p_actor_id uuid, p_pickup_location_id uuid, p_pickup_slot_id uuid, p_payment_method text, p_idempotency_key text, p_items jsonb, p_delivery_address text default null
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_slot public.pickup_slots%rowtype; v_item jsonb; v_product public.products%rowtype; v_deal public.deals%rowtype;
 v_order public.orders%rowtype; v_group_id uuid; v_order_item_id uuid; v_quantity int; v_unit_price int; v_subtotal int:=0; v_count int:=0; v_payment_status text;
begin
 if p_actor_id is null or not exists(select 1 from public.profiles where id=p_actor_id and not is_suspended) then raise exception using errcode='42501',message='유효한 주문 사용자만 주문할 수 있습니다.'; end if;
 if p_payment_method not in('on_site','reservation_only','card') then raise exception using errcode='22023',message='주문 방식을 확인하세요.'; end if;
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
 v_payment_status:=case when p_payment_method='on_site' then 'pay_on_pickup' when p_payment_method='card' then 'pending_payment' else 'not_applicable' end;
 insert into public.orders(user_id,pickup_location_id,pickup_slot_id,subtotal,total_amount,order_status,payment_status,pickup_status,payment_method,idempotency_key,delivery_address)
 values(p_actor_id,p_pickup_location_id,p_pickup_slot_id,v_subtotal,v_subtotal,'pending',v_payment_status,'pending',p_payment_method,p_idempotency_key,nullif(p_delivery_address,'')) returning * into v_order;
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

commit;
