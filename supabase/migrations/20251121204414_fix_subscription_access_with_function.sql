/*
  # Fix subscription access using a function instead of view
  
  1. Changes
    - Drop the problematic stripe_user_subscriptions view
    - Create a function get_user_subscription() that returns subscription data
    - Function uses SECURITY DEFINER to bypass RLS while still being secure
    - Function explicitly checks auth.uid() to ensure users only see their own data
  
  2. Security
    - Function is SECURITY DEFINER but explicitly validates auth.uid()
    - Only returns data for the authenticated user
    - No RLS bypass risk since the function itself does the security check
*/

-- Drop the existing view
DROP VIEW IF EXISTS stripe_user_subscriptions;

-- Create a secure function to get user subscription
CREATE OR REPLACE FUNCTION get_user_subscription()
RETURNS TABLE (
  customer_id text,
  subscription_id text,
  subscription_status text,
  price_id text,
  current_period_start bigint,
  current_period_end bigint,
  cancel_at_period_end boolean,
  payment_method_brand text,
  payment_method_last4 text
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.customer_id,
    s.subscription_id,
    s.status::text AS subscription_status,
    s.price_id,
    s.current_period_start,
    s.current_period_end,
    s.cancel_at_period_end,
    s.payment_method_brand,
    s.payment_method_last4
  FROM stripe_customers c
  LEFT JOIN stripe_subscriptions s ON c.customer_id = s.customer_id
  WHERE 
    c.user_id = auth.uid()
    AND c.deleted_at IS NULL 
    AND (s.deleted_at IS NULL OR s.id IS NULL);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_subscription() TO authenticated;