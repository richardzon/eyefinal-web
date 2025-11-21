import { stripeProducts } from '../stripe-config';
import { SubscriptionCard } from '../components/subscription/SubscriptionCard';
import { SubscriptionStatus } from '../components/subscription/SubscriptionStatus';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export function Subscription() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Sign in required
          </h2>
          <p className="text-gray-600 mb-6">
            Please sign in to view subscription options.
          </p>
          <div className="space-x-4">
            <Link to="/login">
              <Button>Sign In</Button>
            </Link>
            <Link to="/signup">
              <Button variant="outline">Sign Up</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Subscription Plans
          </h1>
          <p className="text-lg text-gray-600">
            Choose the plan that works best for you
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Current Subscription
          </h2>
          <SubscriptionStatus />
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {stripeProducts.map((product) => (
            <SubscriptionCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
}

