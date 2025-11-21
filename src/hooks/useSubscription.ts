import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getProductByPriceId } from '../stripe-config';
import { useAuth } from './useAuth';

export interface UserSubscription {
  customer_id: string | null;
  subscription_id: string | null;
  subscription_status: 'not_started' | 'incomplete' | 'incomplete_expired' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' | 'paused' | null;
  price_id: string | null;
  current_period_start: number | null;
  current_period_end: number | null;
  cancel_at_period_end: boolean | null;
  payment_method_brand: string | null;
  payment_method_last4: string | null;
  product_name?: string;
}

export function useSubscription() {
  const { user, isAuthenticated } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    fetchSubscription();
  }, [isAuthenticated, user]);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .rpc('get_user_subscription');

      if (fetchError) {
        throw fetchError;
      }

      const subscriptionData = Array.isArray(data) && data.length > 0 ? data[0] : null;

      if (subscriptionData) {
        const product = subscriptionData.price_id ? getProductByPriceId(subscriptionData.price_id) : null;
        setSubscription({
          ...subscriptionData,
          product_name: product?.name
        });
      } else {
        setSubscription(null);
      }
    } catch (err) {
      console.error('Error fetching subscription:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch subscription');
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  };

  const hasActiveSubscription = subscription?.subscription_status === 'active' || subscription?.subscription_status === 'trialing';

  return {
    subscription,
    loading,
    error,
    hasActiveSubscription,
    isSubscribed: hasActiveSubscription,
    refetch: fetchSubscription
  };
}

