-- Supabase PostgreSQL Schema for INE Product Price Tracker
-- Safe, idempotent script: creates tables, indexes, triggers, and recreates RLS policies.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. tracked_products table
CREATE TABLE IF NOT EXISTS tracked_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_name TEXT NOT NULL,
    product_url TEXT NOT NULL UNIQUE,
    product_image TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. price_history table
CREATE TABLE IF NOT EXISTS price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracked_product_id UUID NOT NULL REFERENCES tracked_products(id) ON DELETE CASCADE,
    price NUMERIC(12, 2) NOT NULL,
    stock_status TEXT NOT NULL,
    scraped_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. scrape_logs table
CREATE TABLE IF NOT EXISTS scrape_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracked_product_id UUID NOT NULL REFERENCES tracked_products(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    trigger_type TEXT NOT NULL DEFAULT 'MANUAL' CHECK (trigger_type IN ('MANUAL', 'AUTOMATIC')),
    status TEXT NOT NULL CHECK (status IN ('SUCCESS', 'FAILURE')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    error_message TEXT,
    http_status INTEGER
);

-- Idempotent column addition for existing databases
ALTER TABLE scrape_logs 
ADD COLUMN IF NOT EXISTS trigger_type TEXT NOT NULL DEFAULT 'MANUAL' 
CHECK (trigger_type IN ('MANUAL', 'AUTOMATIC'));

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_tracked_products_is_active 
    ON tracked_products(is_active);

CREATE INDEX IF NOT EXISTS idx_price_history_product_scraped 
    ON price_history(tracked_product_id, scraped_at DESC);

CREATE INDEX IF NOT EXISTS idx_scrape_logs_product_started 
    ON scrape_logs(tracked_product_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_scrape_logs_trigger_type 
    ON scrape_logs(tracked_product_id, trigger_type, started_at DESC);

-- Automatically update updated_at timestamp on tracked_products
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS tr_tracked_products_updated_at ON tracked_products;
CREATE TRIGGER tr_tracked_products_updated_at
    BEFORE UPDATE ON tracked_products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE tracked_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_logs ENABLE ROW LEVEL SECURITY;

-- Idempotent RLS Policies for tracked_products
DROP POLICY IF EXISTS "Allow anon read tracked_products" ON tracked_products;
CREATE POLICY "Allow anon read tracked_products" ON tracked_products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anon insert tracked_products" ON tracked_products;
CREATE POLICY "Allow anon insert tracked_products" ON tracked_products FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon update tracked_products" ON tracked_products;
CREATE POLICY "Allow anon update tracked_products" ON tracked_products FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow anon delete tracked_products" ON tracked_products;
CREATE POLICY "Allow anon delete tracked_products" ON tracked_products FOR DELETE USING (true);

-- Idempotent RLS Policies for price_history
DROP POLICY IF EXISTS "Allow anon read price_history" ON price_history;
CREATE POLICY "Allow anon read price_history" ON price_history FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anon insert price_history" ON price_history;
CREATE POLICY "Allow anon insert price_history" ON price_history FOR INSERT WITH CHECK (true);

-- Idempotent RLS Policies for scrape_logs
DROP POLICY IF EXISTS "Allow anon read scrape_logs" ON scrape_logs;
CREATE POLICY "Allow anon read scrape_logs" ON scrape_logs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anon insert scrape_logs" ON scrape_logs;
CREATE POLICY "Allow anon insert scrape_logs" ON scrape_logs FOR INSERT WITH CHECK (true);
