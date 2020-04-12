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


--Insert Table queries:
