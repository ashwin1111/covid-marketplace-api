-- use this file to store sql logs like creating a table / view, adding functions, etc..,

-- Heroku Postgres CLI
-- heroku pg:psql postgresql-convex-88085 --app covid-marketplace

alter table customer_cred add COLUMN customer_created_at TIMESTAMP;