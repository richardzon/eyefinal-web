import { useAuth } from '../hooks/useAuth';
import { useSubscription } from '../hooks/useSubscription';
import { SubscriptionStatus } from '../components/subscription/SubscriptionStatus';
import { Button } from '../components/ui/Button';
import { Link } from 'react-router-dom';

export function Dashboard() {
  const { user, signOut } = useAuth();
  const { hasActiveSubscription } = useSubscription();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">Predictor v3.0</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">
                {user?.email}
              </span>
              <Button variant="outline" onClick={signOut}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid gap-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Welcome to your Dashboard
              </h2>
              <p className="text-gray-600 mb-6">
                Manage your subscription and access premium features.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Subscription Status
              </h3>
              <SubscriptionStatus />
            </div>

            {!hasActiveSubscription && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-blue-900 mb-2">
                  Upgrade to Premium
                </h3>
                <p className="text-blue-700 mb-4">
                  Get access to advanced predictions and premium features.
                </p>
                <Link to="/subscription">
                  <Button>View Plans</Button>
                </Link>
              </div>
            )}

            {hasActiveSubscription && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-green-900 mb-2">
                  Premium Features Available
                </h3>
                <p className="text-green-700 mb-4">
                  You have access to all premium features and predictions.
                </p>
                <Link to="/predictions">
                  <Button className="mb-4">Go to Predictions</Button>
                </Link>
                <div className="space-y-2">
                  <div className="flex items-center text-green-700">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    Advanced match predictions
                  </div>
                  <div className="flex items-center text-green-700">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    Historical data analysis
                  </div>
                  <div className="flex items-center text-green-700">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    Real-time updates
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

