import { useState } from 'react';
import { StripeProduct } from '../../stripe-config';
import { createCheckoutSession, redirectToCheckout } from '../../services/stripe';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { useSubscription } from '../../hooks/useSubscription';
import { CheckCircle } from 'lucide-react';

interface SubscriptionCardProps {
  product: StripeProduct;
}

export function SubscriptionCard({ product }: SubscriptionCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { hasActiveSubscription, subscription } = useSubscription();

  const handleSubscribe = async () => {
    setLoading(true);
    setError(null);

    try {
      const { url } = await createCheckoutSession({
        price_id: product.priceId,
        mode: product.mode,
        success_url: `${window.location.origin}/success`,
        cancel_url: window.location.href,
      });

      redirectToCheckout(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create checkout session');
      setLoading(false);
    }
  };

  // Check if this is the user's current subscription
  const isCurrentPlan = hasActiveSubscription && subscription?.price_id === product.priceId;

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 border-2 ${isCurrentPlan ? 'border-emerald-500' : 'border-gray-200'}`}>
      <div className="text-center">
        {isCurrentPlan && (
          <div className="mb-3 flex items-center justify-center text-emerald-600">
            <CheckCircle className="w-5 h-5 mr-2" />
            <span className="text-sm font-semibold">Current Plan</span>
          </div>
        )}
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {product.name}
        </h3>
        <p className="text-gray-600 mb-4">
          {product.description}
        </p>
        <div className="mb-6">
          <span className="text-3xl font-bold text-gray-900">
            {product.currencySymbol}{product.price.toFixed(2)}
          </span>
          {product.mode === 'subscription' && (
            <span className="text-gray-600 ml-1">/month</span>
          )}
        </div>

        {error && (
          <Alert type="error" className="mb-4">
            {error}
          </Alert>
        )}

        {isCurrentPlan ? (
          <Button
            disabled
            className="w-full"
            size="lg"
          >
            Active
          </Button>
        ) : (
          <Button
            onClick={handleSubscribe}
            loading={loading}
            className="w-full"
            size="lg"
          >
            {hasActiveSubscription ? 'Switch Plan' : (product.mode === 'subscription' ? 'Subscribe Now' : 'Buy Now')}
          </Button>
        )}
      </div>
    </div>
  );
}

