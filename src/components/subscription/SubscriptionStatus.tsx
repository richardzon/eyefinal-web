import { useSubscription } from '../../hooks/useSubscription';
import { Alert } from '../ui/Alert';
import { CircleCheck as CheckCircle, Circle as XCircle, Clock } from 'lucide-react';

export function SubscriptionStatus() {
  const { subscription, loading, error, hasActiveSubscription } = useSubscription();

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert type="error">
        Failed to load subscription status: {error}
      </Alert>
    );
  }

  if (!subscription || subscription.subscription_status === 'not_started') {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <div className="flex items-center">
          <XCircle className="h-5 w-5 text-gray-400 mr-2" />
          <span className="text-gray-600">No active subscription</span>
        </div>
      </div>
    );
  }

  const getStatusIcon = () => {
    if (hasActiveSubscription) {
      return <CheckCircle className="h-5 w-5 text-green-500 mr-2" />;
    }
    return <Clock className="h-5 w-5 text-yellow-500 mr-2" />;
  };

  const getStatusText = () => {
    switch (subscription.subscription_status) {
      case 'active':
        return 'Active';
      case 'trialing':
        return 'Trial Period';
      case 'past_due':
        return 'Past Due';
      case 'canceled':
        return 'Canceled';
      case 'incomplete':
        return 'Incomplete';
      default:
        return subscription.subscription_status || 'Unknown';
    }
  };

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="space-y-3">
        <div className="flex items-center">
          {getStatusIcon()}
          <span className="font-medium text-gray-900">
            {subscription.product_name || 'Subscription'}
          </span>
          <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
            hasActiveSubscription 
              ? 'bg-green-100 text-green-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {getStatusText()}
          </span>
        </div>
        
        {subscription.current_period_end && (
          <div className="text-sm text-gray-600">
            {subscription.cancel_at_period_end ? 'Expires' : 'Renews'} on{' '}
            {formatDate(subscription.current_period_end)}
          </div>
        )}
        
        {subscription.payment_method_brand && subscription.payment_method_last4 && (
          <div className="text-sm text-gray-600">
            Payment method: {subscription.payment_method_brand.toUpperCase()} ****{subscription.payment_method_last4}
          </div>
        )}
      </div>
    </div>
  );
}

