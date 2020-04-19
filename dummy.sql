-- use this file to store sql logs like creating a table / view, adding functions, etc..,
--  pg_dump -h ec2-54-152-175-141.compute-1.amazonaws.com -U aquohymxuwciho d7qgqfjkr2g75s > "2020_04_17_db_backup.sql"
--  pwd: 48c06808b06c6a6596454a0bcbd98549848211dd5757ef2339dcb81b6c22c06c
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

--resend otp table:

create table resend_otp(phone_num text,otp_requested_at timestamp);

--Alter Table queries:

ALTER TABLE customer_cred ALTER COLUMN customer_email SET NOT NULL;
ALTER TABLE customer_cred ALTER COLUMN customer_phone SET NOT NULL;
ALTER TABLE customer_cred ALTER COLUMN customer_aadhar_num SET NOT NULL;

ALTER TABLE customer_cred ADD COLUMN verified bit;

ALTER TABLE customer_cred ADD COLUMN otp INTEGER;

ALTER TABLE customer_cred ADD COLUMN expiry_time timestamp;

ALTER Table customer_cred ALTER COLUMN verified TYPE text;

ALTER TABLE customer_cred alter verified set DEFAULT 'otp_pending';

ALTER table customer_cred ADD CONSTRAINT unique_values UNIQUE (customer_email);
ALTER table customer_cred ADD CONSTRAINT unique_ph_values UNIQUE (customer_phone);
ALTER table customer_cred ADD CONSTRAINT unique_ad_values UNIQUE (customer_aadhar_num);

ALTER TABLE market_place_all_details ADD COLUMN market_place_address text;

ALTER Table count_updates ADD COLUMN time_slot_id text REFERENCES time_slot(time_slot_id);

ALTER table count_updates RENAME COLUMN count to count_on_slot;

ALTER TABLE bookings ADD COLUMN digit_code BIGINT;

Alter table market_place_all_details ADD column on_dates text;

Alter table count_updates ADD column on_date text;

Alter table bookings ADD column on_date text;

Alter table active_market_place_details DROP column present_customer_count ;

alter table active_market_place_details ADD column active_time_slot_id text;

alter table active_market_place_details ADD column booking_id text;

ALTER table active_market_place_details ADD CONSTRAINT unique_book_values UNIQUE (booking_id);

ALTER table market_place_all_details Add column market_license_number text;
--Update Table queries:

update customer_cred SET verified = 'verified' where verified ='1';

update customer_cred SET verified = 'otp_pending' where verified ='0';


--Insert Table queries:

insert into admin_cred values('aid3ijnuw', 'COVID-19' ,'$2a$08$VQOpb70ElK9339vW5.tGuelKZtCzkwIt7zm7jOex6eQ8Y92G9GD62',now()); -- password: 'covid-market-19' userid: 'aid3ijnuw'

INSERT INTO time_slot VALUES ('1','9 AM to 9:30 AM',now()),('2','9:30 AM to 10 AM',now()),('3','10 AM to 10:30 AM',now()),('4','10:30 AM to 11 AM',now()),('5','11 AM to 11:30 AM',now()),('6','11:30 AM to 12 AM',now()),('7','12 PM to 12:30 PM',now()),('8','12:30 PM to 1 PM',now());


INSERT INTO count_updates (count_update_id,market_place_id,time_slot_id,count,created_at) values('cuidywhnl2','mpadidjhsdvf','mpidvhclme',0,now()),('cuidpz4s44','mpadidjhsdvf','mpidd2g6f8',0,now()),('cuid7ch7gk','mpadidjhsdvf','mpidblijzd',0,now()),('cuid4bc1jb','mpadidjhsdvf','mpidkv1mfa',0,now()),('cuid57s1d0','mpadidjhsdvf','mpidtbbnsm',0,now()),('cuidqq7pr1','mpadidb40mu2','mpidvhclme',0,now()),('cuid4fespw','mpadidb40mu2','mpidd2g6f8',0,now()),('cuidd45ss3','mpadidb40mu2','mpidblijzd',0,now()),('cuid1qz921','mpadidb40mu2','mpidkv1mfa',0,now());
--Select / View queries:

--Market-place_details query:

-- old:SELECT mpad.market_place_id,mpad.market_palce_name,mpad.market_place_address,(SELECT json_build_object('ids',string_agg(t.time_slot_id,','),'time_slot_ranges', string_agg(t.time_slot_range, ',')) as time_slot from time_slot as t where t.time_slot_id IN (select regexp_split_to_table(time_slot_ids, E',') from market_place_all_details as m where m.market_place_id=mpad.market_place_id)) from market_place_all_details as mpad where mpad.active_check='1';
--new and correct:

SELECT mpad.market_place_id,mpad.market_palce_name,mpad.market_place_address,(SELECT json_agg(json_build_object('id',t.time_slot_id,'time_slot_range', t.time_slot_range)) as time_slot_data from time_slot as t left join (select distinct regexp_split_to_table(m.time_slot_ids, E',') as time_id, m.market_place_id as market_place_id, m.customer_max_count as max_cus_count from market_place_all_details as m where m.market_place_id=mpad.market_place_id ) as st On st.time_id = t.time_slot_id left join count_updates as cu on cu.market_place_id=st.market_place_id AND cu.time_slot_id=st.time_id AND cu.count_on_slot < st.max_cus_count where st.time_id is NOT NULL AND cu.count_on_slot is NOT NULL) from market_place_all_details as mpad where mpad.active_check='1';

--with date: wrong time repeat
SELECT  mpad.market_place_id,
        mpad.market_palce_name,
        mpad.market_place_address,
        '2020-12-05' as on_date,
        (SELECT json_agg(json_build_object('id',t.time_slot_id,'time_slot_range', t.time_slot_range)) as time_slot_data 
        from time_slot as t 
        left join   (select distinct regexp_split_to_table(m.time_slot_ids, E',') as time_id
                    ,m.market_place_id as market_place_id
                    ,m.customer_max_count as max_cus_count 
                    from market_place_all_details as m 
                    where m.market_place_id=mpad.market_place_id ) as st On st.time_id = t.time_slot_id 
        left join count_updates as cu on cu.market_place_id=st.market_place_id AND cu.time_slot_id=st.time_id AND cu.count_on_slot < st.max_cus_count 
        where st.time_id is NOT NULL AND cu.count_on_slot is NOT NULL) 
from market_place_all_details as mpad where mpad.active_check='1' and '2020-12-05' = ANY (string_to_array(mpad.on_dates,','));

--with date :correct
SELECT  mpad.market_place_id,
        mpad.market_palce_name,
        mpad.market_place_address,
        '2020-04-16' as on_date,
        (Select json_agg(json_build_object('id',f.time_slot_id,'time_slot_range', f.time_slot_range))
        from (SELECT Distinct t.time_slot_id, t.time_slot_range 
                from time_slot as t 
                left join   (select distinct regexp_split_to_table(m.time_slot_ids, E',') as time_id
                                            ,m.market_place_id as market_place_id
                                            ,m.customer_max_count as max_cus_count 
                                from market_place_all_details as m 
                                where m.market_place_id=mpad.market_place_id ) as st On st.time_id = t.time_slot_id 
                left join count_updates as cu on cu.market_place_id=st.market_place_id AND cu.time_slot_id=st.time_id AND cu.count_on_slot < st.max_cus_count 
                where st.time_id is NOT NULL AND cu.count_on_slot is NOT NULL) as f ) 
from market_place_all_details as mpad 
where mpad.active_check='1' and '2020-04-17' = ANY (string_to_array(mpad.on_dates,',')) and mpad.market_place_id='mpadidmsgwh3';


SELECT  mpad.market_place_id,
        mpad.market_palce_name,
        mpad.market_place_address,
        '2020-04-16' as on_date,
        (Select json_agg(json_build_object('id',f.time_slot_id,'time_slot_range', f.time_slot_range))
        from (SELECT Distinct t.time_slot_id, t.time_slot_range,st.max_cus_count,cu.count_on_slot,cu.on_date
                from time_slot as t 
                left join   (select distinct regexp_split_to_table(m.time_slot_ids, E',') as time_id
                                        ,m.market_place_id as market_place_id
                                        ,m.customer_max_count as max_cus_count 
                        from market_place_all_details as m 
                        where m.market_place_id=mpad.market_place_id) as st On st.time_id = t.time_slot_id 
                left join count_updates as cu on cu.market_place_id=st.market_place_id AND cu.time_slot_id=st.time_id AND cu.count_on_slot < st.max_cus_count 
                where st.time_id is NOT NULL AND cu.count_on_slot is NOT NULL) as f
                where f.on_date='2020-04-16')
from market_place_all_details as mpad 
where mpad.active_check='1' and '2020-04-16' = ANY (string_to_array(mpad.on_dates,',')) and mpad.market_place_id='mpadid4spqkn';

SELECT  mpad.market_place_id,
        mpad.market_palce_name,
        mpad.market_place_address,
        '2020-04-16' as on_date,
        (Select json_agg(json_build_object('id',f.time_slot_id,'time_slot_range', f.time_slot_range))
        from (SELECT Distinct t.time_slot_id, t.time_slot_range,st.max_cus_count,cu.count_on_slot,cu.on_date
                from time_slot as t 
                left join   (select distinct regexp_split_to_table(m.time_slot_ids, E',') as time_id
                                        ,m.market_place_id as market_place_id
                                        ,m.customer_max_count as max_cus_count 
                        from market_place_all_details as m 
                        where m.market_place_id=mpad.market_place_id) as st On st.time_id = t.time_slot_id 
                left join count_updates as cu on cu.market_place_id=st.market_place_id AND cu.time_slot_id=st.time_id AND cu.count_on_slot < st.max_cus_count 
                where st.time_id is NOT NULL AND cu.count_on_slot is NOT NULL) as f
                where f.on_date='2020-04-16' AND f.time_slot_id is NOT NULL)           
from market_place_all_details as mpad
where mpad.active_check='1' and '2020-04-16' = ANY (string_to_array(mpad.on_dates,','));

--booking query:

--check possible count
Select (m.customer_max_count-cu.count_on_slot) as possible_count from market_place_all_details as m
left join count_updates as cu On m.market_place_id=cu.market_place_id
where m.market_place_id='mpadidb40mu2' AND cu.time_slot_id='mpidd2g6f8';

--Select tab1.one as pre_booked,tab2.possible_count as remaining_slot from (select count(*) as one from bookings where booking_market_place_id='mpadidb40mu2' AND booking_customer_id='cidgbqx26' AND booking_time_slot_id='mpidkv1mfa' AND created_at::date = '2020-04-13') as tab1,(Select (m.customer_max_count-cu.count_on_slot) as possible_count from market_place_all_details as m left join count_updates as cu On m.market_place_id=cu.market_place_id where m.market_place_id='mpadidb40mu2' AND cu.time_slot_id= 'mpidkv1mfa') as tab2; where tab1.one != 1 AND tab2.possible_count !=0;

Select tab1.one as pre_booked,tab2.possible_count as remaining_slot from (select count(*) as one from bookings where booking_market_place_id='mpadidt2apps' AND booking_customer_id='cidwyerex' AND booking_time_slot_id='mpidvhclme' AND on_date = '2020-12-05') as tab1,(Select (m.customer_max_count-cu.count_on_slot) as possible_count from market_place_all_details as m left join count_updates as cu On m.market_place_id=cu.market_place_id where m.market_place_id='mpadidt2apps' AND cu.time_slot_id= 'mpidvhclme' and cu.on_date='2020-12-05') as tab2;

INSERT INTO bookings(booking_id,booking_customer_id,booking_market_place_id,booking_time_slot_id,qr_code,digital_code,active_check,created_at) values($1,$2,$3,$4,$5,$6,'1',now());

-- Update count_updates SET count_on_slot = count_on_slot + 1 where market_place_id='mpadidb40mu2' AND time_slot_id='mpidd2g6f8' AND count_on_slot < (select customer_max_count from market_place_all_details where market_place_id='mpadidb40mu2');

Update count_updates SET count_on_slot = count_on_slot + 1 where market_place_id='mpadidt2apps' AND time_slot_id='mpidvhclme' AND on_date='2020-12-03' AND count_on_slot < (select customer_max_count from market_place_all_details where market_place_id=$1 AND '2020-12-03' = ANY (string_to_array(on_dates,',')))


--admin add market:

INSERT INTO market_place_all_details (market_place_id,market_palce_name,market_place_address,time_slot_ids,customer_max_count,active_check,created_at) values('mpadidjhsdvf','Shoppers Stop','Pollachi complex 1st floor','mpidvhclme,mpidd2g6f8,mpidblijzd,mpidkv1mfa,mpidtbbnsm',30,'1',now()),('mpadidb40mu2','Fossil','Pollachi main road 1st street','mpidvhclme,mpidd2g6f8,mpidblijzd,mpidkv1mfa',10,'1',now());

Select regexp_split_to_table('cuidymab13,cuid7cbs1z,cuidyno5ft,cuid5347k8', E','),m.market_place_id,regexp_split_to_table(m.time_slot_ids, E',') as time_slot_id,'0' as c,now() as t
from market_place_all_details as m where m.market_place_id='mpadidb40mu2';

-- INSERT INTO count_updates (count_update_id,market_place_id,time_slot_id,count_on_slot,created_at) 
-- Select regexp_split_to_table('cuidbehbzl,cuidx6ywak,cuidcqw3bc', E','),m.market_place_id,regexp_split_to_table(m.time_slot_ids, E',') as time_slot_id,'0' as c,now() as t
-- from market_place_all_details as m where m.market_place_id='mpadid8yio8e';

INSERT INTO count_updates (count_update_id,market_place_id,on_date,time_slot_id,count_on_slot,created_at)
SELECT inside.*,regexp_split_to_table(mo.time_slot_ids, E',') as time_slot_id 
from market_place_all_details as mo,(Select m.market_place_id,regexp_split_to_table(m.on_dates, E',') as date,'0' as c,now() 
                                    from market_place_all_details as m 
                                    where m.market_place_id ='mpadid7r1g7c') as inside
where mo.market_place_id='mpadid7r1g7c';
(select regexp_split_to_table('cuids93h9f,cuid9kgick,cuidnbtz38,cuidj54bdt,cuidi1irgv,cuidfkay10,cuidjg16vj,cuidoau1jz', E',') as i)as id;


--admin market_list:

SELECT mpad.market_place_id,mpad.market_palce_name,mpad.market_place_address,
       (SELECT json_agg(json_build_object('id',t.time_slot_id,'time_slot_range', t.time_slot_range)) as time_slot 
       from time_slot as t 
       where t.time_slot_id IN (select regexp_split_to_table(time_slot_ids, E',') 
                                from market_place_all_details as m 
                                where m.market_place_id=mpad.market_place_id)) as time_data,mpad.customer_max_count,mpad.active_check
from market_place_all_details as mpad ;

--udpdate market_place:

--update query

--select difference:

SELECT market.count as market_time_count,updates.count as update_time_count from (Select count(*) from (select regexp_split_to_table(time_slot_ids, E',') as times from market_place_all_details where market_place_id ='mpadidxfi6zd') AS m) AS market,(select count(*) from count_updates where market_place_id = 'mpadidxfi6zd') AS updates;

select * from count_updates as cu where cu.time_slot_id IN (select regexp_split_to_table(m.time_slot_ids, E',') from market_place_all_details as m where m.market_place_id=cu.market_place_id) AND cu.market_place_id='mpadidxfi6zd';

select * from count_updates as cu where cu.time_slot_id NOT IN (select regexp_split_to_table(m.time_slot_ids, E',') from market_place_all_details as m where m.market_place_id=cu.market_place_id) AND cu.market_place_id='mpadidxfi6zd';


--booking history page:

select b.booking_id,
market.market_data,
b.booking_time_slot_id,
(select time_slot_range from time_slot where time_slot_id=b.booking_time_slot_id),
'https://testtest.s3.us-east-2.amazonaws.com/'|| qr_code  as file_name,
b.digit_code,
b.on_date,
b.created_at
from bookings as b
left join (select market_place_id,json_build_object('name',market_palce_name,'address',market_place_address) as market_data ,on_dates from market_place_all_details)as market on market.market_place_id=b.booking_market_place_id 
where b.booking_customer_id='cidwyerex' and b.active_check= '1';

-- AND b.on_date = ANY (string_to_array(market.on_dates,','))

--scanner queries:
-- display shops:

select  market_place_id,
        market_palce_name, 
        market_place_address 
from market_place_all_details 
where '2020-12-03' = ANY (string_to_array(on_dates,',')) AND active_check='1';

--scanner activity:

--details check:
select * from bookings where booking_id='bidp6yliv' AND booking_market_place_id='mpadidt2apps';

--do_it check:
select exit_time from active_market_place_details where booking_id =$1;

-- count display after entry insert:

INSERT into active_market_place_details(active_market_place_details_id,booking_id,active_customer_id,active_market_palce_id,active_time_slot_id,entry_time,created_at)
select $1,booking_id,booking_customer_id,booking_market_place_id,booking_time_slot_id,now() as entry,now() as created_at from bookings where booking_id ='bidp6yliv';

select active_market_palce_id,count(*) 
from active_market_place_details 
where active_market_palce_id=(  select booking_market_place_id 
                                from bookings 
                                where booking_id='bidp6yliv') AND exit_time is NULL group by active_market_palce_id;

-- count display after exit update:

Update active_market_place_details SET exit_time = now() where booking_id='bidp6yliv';

select active_market_palce_id,count(*) 
from active_market_place_details 
where active_market_palce_id=(  select booking_market_place_id 
                                from bookings 
                                where booking_id='bidp6yliv') AND exit_time is NULL group by active_market_palce_id;


--analytics:

--date_counts:

Select  m.market_place_id,
        m.market_palce_name,
        m.market_place_address,
        (Select json_agg(json_build_object('id',f.time_slot_id,'time_slot_range', f.time_slot_range,'remaining_booking_count',m.customer_max_count-cu.count_on_slot))
        from time_slot as f left join count_updates as cu ON cu.time_slot_id = f.time_slot_id where f.time_slot_id in (SELECT regexp_split_to_table(m.time_slot_ids, E',')) AND cu.market_place_id=m.market_place_id AND cu.on_date='2020-04-18') as time_slot_data,
        m.customer_max_count,
        (select count(*) 
        from active_market_place_details 
        where booking_id IN (select booking_id 
                        from bookings where on_date='2020-04-18' and booking_market_place_id=m.market_place_id) and exit_time is not null) as visited_people,
        (select count(*) 
        from active_market_place_details 
        where booking_id IN (select booking_id 
                        from bookings where on_date='2020-04-18' and booking_market_place_id=m.market_place_id) and exit_time is null) as present_people,
        '2020-04-18' as date  
from market_place_all_details as m 
where m.market_place_id IN (SELECT market_place_id 
                                 from market_place_all_details 
                                 where '2020-04-18' = ANY (string_to_array(on_dates,',')));
-- group by m.market_place_id;

--daily counts:

-- conflicts, idk which one to remove
select  count(b.*) as booked_count,
        (select count(*) 
        from active_market_place_details 
        where booking_id IN     (select booking_id 
                                from bookings 
                                where on_date =b.on_date)) as visited_count,
        b.on_date 
from bookings as b 
where b.on_date in (select regexp_split_to_table('2020-04-16,2020-04-15,2020-04-17',E',')) 
group by b.on_date;


---truncate queries:

TRUNCATE customer_cred CASCADE;
TRUNCATE market_place_all_details CASCADE;
TRUNCATE bookings;
TRUNCATE active_market_place_details;
TRUNCATE count_updates;
TRUNCATE resend_otp;
TRUNCATE time_slot;

ALTER Table market_place_all_details ALTER COLUMN market_license_number SET NOT NULL;
INSERT INTO time_slot VALUES ('1','9 AM to 9:30 AM',now()),('2','9:30 AM to 10 AM',now()),('3','10 AM to 10:30 AM',now()),('4','10:30 AM to 11 AM',now()),('5','11 AM to 11:30 AM',now()),('6','11:30 AM to 12 AM',now()),('7','12 PM to 12:30 PM',now()),('8','12:30 PM to 1 PM',now());


---get_time_slots_on_date

select  count(market_license_number) as market_count,
        (SELECT (select time_slot_range from time_slot where time_slot_id=max(v.time_slot_ids)) as last_time_slot 
        FROM    (select regexp_split_to_table(time_slot_ids,',') as time_slot_ids 
                from market_place_all_details 
                where '2020-04-19' = ANY (string_to_array(on_dates,','))) as v),
        (SELECT (select time_slot_range from time_slot where time_slot_id=min(v.time_slot_ids)) as first_time_slot 
        FROM    (select regexp_split_to_table(time_slot_ids,',') as time_slot_ids 
                from market_place_all_details 
                where '2020-04-19' = ANY (string_to_array(on_dates,','))) as v) 
from market_place_all_details as m 
where '2020-04-19' = ANY (string_to_array(m.on_dates,','));