-- use this file to store sql logs like creating a table / view, adding functions, etc..,

-- Heroku Postgres CLI
-- heroku pg:psql postgresql-convex-88085 --app covid-marketplace

--Create Table queries:

--Admin table:

create table admin_cred( admin_id text PRIMARY KEY, admin_user_name text, admin_password text, created_at timestamp);

--Customer table:

create table customer_cred( customer_id text PRIMARY KEY, customer_name text, customer_email text, customer_phone text, customer_aadhar_num text, customer_password text, created_at timestamp);

--Time slot table:

create table time_slot( time_slot_id text PRIMARY KEY, time_slot_range text, created_at timestamp);

--Market-place All details:

create table market_place_all_details( market_place_id text PRIMARY KEY, market_palce_name text, time_slot_ids text, customer_max_count integer, active_check bit, created_at timestamp);

--Bookings Table:

create table bookings( booking_id text PRIMARY KEY, booking_customer_id text References customer_cred(customer_id), booking_market_place_id text References market_place_all_details(market_place_id),booking_time_slot_id text References time_slot(time_slot_id), qr_code text, active_check bit, created_at timestamp);

--Active market-place customer visit details table:

create table active_market_place_details(active_market_place_details_id text PRIMARY KEY, active_customer_id text References customer_cred(customer_id), active_market_palce_id text References market_place_all_details(market_place_id), entry_time timestamp without time zone,exit_time timestamp without time zone,present_customer_count INTEGER, created_at timestamp);

--Count Updates table:

create table count_updates(count_update_id text PRIMARY KEY, market_place_id text References market_place_all_details(market_place_id), count INTEGER, created_at timestamp);

--Alter Table queries:

ALTER TABLE customer_cred ALTER COLUMN customer_email SET NOT NULL;
ALTER TABLE customer_cred ALTER COLUMN customer_phone SET NOT NULL;
ALTER TABLE customer_cred ALTER COLUMN customer_aadhar_num SET NOT NULL;

ALTER TABLE customer_cred ADD COLUMN verified bit;

ALTER TABLE customer_cred alter verified set DEFAULT '0';

ALTER table customer_cred ADD CONSTRAINT unique_values UNIQUE (customer_email,customer_phone,customer_aadhar_num);

ALTER TABLE market_place_all_details ADD COLUMN market_place_address text;

--Update Table queries:

update customer_cred SET verified = '0' where verified is NULL;

--Insert Table queries:

insert into admin_cred values('aid3ijnuw', 'COVID-19' ,'$2a$08$VQOpb70ElK9339vW5.tGuelKZtCzkwIt7zm7jOex6eQ8Y92G9GD62',now()); -- password: 'covid-market-19' userid: 'aid3ijnuw'

INSERT INTO time_slot VALUES ('mpidvhclme','9 AM to 9:30 AM',now()),('mpidd2g6f8','9:30 AM to 10 AM',now()),('mpidblijzd','10 AM to 10:30 AM',now()),('mpidkv1mfa','10:30 AM to 11 AM',now()),('mpidtbbnsm','11 AM to 11:30 AM',now());


INSERT INTO market_place_all_details (market_place_id,market_palce_name,market_place_address,time_slot_ids,customer_max_count,active_check,created_at) values('mpadidjhsdvf','Shoppers Stop','Pollachi complex 1st floor','mpidvhclme,mpidd2g6f8,mpidblijzd,mpidkv1mfa,mpidtbbnsm',30,'1',now()),('mpadidb40mu2','Fossil','Pollachi main road 1st street','mpidvhclme,mpidd2g6f8,mpidblijzd,mpidkv1mfa',10,'1',now());

--Select / View queries:

-- Select Distinct ON (mpad.market_place_id) mpad.market_place_id,mpad.market_palce_name,mpad.market_place_address,t.time_slot_range from market_place_all_details as mpad 
-- Left Join time_slot As t ON t.time_slot_id In (select regexp_split_to_table(time_slot_ids, E',') from market_place_all_details as m where m.market_place_id=mpad.market_place_id)
-- where mpad.active_check = '1'
-- GROUP BY mpad.market_place_id,t.time_slot_range;

--market-place_details query:

SELECT mpad.market_place_id,mpad.market_palce_name,mpad.market_place_address,(SELECT string_agg(t.time_slot_range, ',') as time_slot_ranges from time_slot as t where t.time_slot_id IN (select regexp_split_to_table(time_slot_ids, E',') from market_place_all_details as m where m.market_place_id=mpad.market_place_id)) from market_place_all_details as mpad where mpad.active_check='1';