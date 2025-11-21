import { useState } from 'react';
import { StripeProduct } from '../../stripe-config';
import { createCheckoutSession, redirectToCheckout } from '../../services/stripe';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';

interface SubscriptionCardProps {
  product: StripeProduct;
}

export function SubscriptionCard({ product }: SubscriptionCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="text-center">
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
        
        <Button
          onClick={handleSubscribe}
          loading={loading}
          className="w-full"
          size="lg"
        >
          {product.mode === 'subscription' ? 'Subscribe Now' : 'Buy Now'}
        </Button>
      </div>
    </div>
  );
}

