-- ============================================================================
-- Migration: Create Payments Table
-- ============================================================================
-- Creates the payments table for tracking all membership payments
-- (Stripe, PayPal, cash, and wire transfer)
--
-- This migration is idempotent and safe to run multiple times.
-- ============================================================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('stripe', 'paypal', 'cash', 'wire')),
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'CAD',
  payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  membership_expires_at TIMESTAMPTZ NOT NULL,
  -- Payment method specific IDs
  stripe_subscription_id TEXT,
  stripe_payment_intent_id TEXT,
  paypal_subscription_id TEXT,
  paypal_transaction_id TEXT,
  -- Manual payment details
  recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_subscription_id ON payments(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_paypal_subscription_id ON payments(paypal_subscription_id);

-- Add documentation comments
COMMENT ON TABLE payments IS 'Tracks all membership payments including Stripe, PayPal, cash, and wire transfer';
COMMENT ON COLUMN payments.payment_method IS 'Payment method: stripe, paypal, cash, or wire';
COMMENT ON COLUMN payments.status IS 'Payment status: pending, completed, failed, or refunded';
COMMENT ON COLUMN payments.recorded_by IS 'Admin user who recorded manual payment (for cash/PayPal)';

-- Enable Row Level Security
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for clean re-runs)
DROP POLICY IF EXISTS "Users can view own payments" ON payments;
DROP POLICY IF EXISTS "Admins can view all payments" ON payments;
DROP POLICY IF EXISTS "Admins can insert payments" ON payments;
DROP POLICY IF EXISTS "Service role can insert payments" ON payments;

-- Users can view their own payments
CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all payments
CREATE POLICY "Admins can view all payments"
  ON payments FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Admins can insert payments (for manual payment recording)
CREATE POLICY "Admins can insert payments"
  ON payments FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

-- Service role can insert payments (for webhooks and system operations)
CREATE POLICY "Service role can insert payments"
  ON payments FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
