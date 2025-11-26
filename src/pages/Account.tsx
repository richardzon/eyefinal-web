import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSubscription } from '../hooks/useSubscription';
import { TelegramActivation } from '../components/subscription/TelegramActivation';
import { Button } from '../components/ui/Button';
import { 
  ArrowLeft, 
  Crown, 
  CreditCard,
  Calendar,
  ExternalLink,
  LogOut,
  User
} from 'lucide-react';

export function Account() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { subscription, hasActiveSubscription, loading } = useSubscription();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleSignOut = async () => {
    setLoggingOut(true);
    await signOut();
    navigate('/');
  };

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Redirect if not authenticated
  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-brand-dark">
      {/* Nav */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        <Link to="/" className="inline-flex items-center text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>
      </div>

      <div className="max-w-3xl mx-auto px-4 pb-16">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">Account Settings</h1>
          <p className="text-slate-400">{user.email}</p>
        </div>

        {/* Subscription Status */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                hasActiveSubscription ? 'bg-tennis/20' : 'bg-slate-700'
              }`}>
                <Crown className={`w-5 h-5 ${hasActiveSubscription ? 'text-tennis' : 'text-slate-400'}`} />
              </div>
              <div>
                <h2 className="text-white font-semibold">
                  {hasActiveSubscription ? 'Premium Active' : 'No Active Subscription'}
                </h2>
                {hasActiveSubscription && subscription?.current_period_end && (
                  <p className="text-slate-400 text-sm">
                    {subscription.cancel_at_period_end ? 'Expires' : 'Renews'} {formatDate(subscription.current_period_end)}
                  </p>
                )}
              </div>
            </div>
            
            {hasActiveSubscription ? (
              <span className="bg-tennis/20 text-tennis text-xs font-medium px-3 py-1 rounded-full">
                Active
              </span>
            ) : (
              <Link to="/premium">
                <Button size="sm" className="bg-tennis hover:bg-tennis/90 text-black">
                  Upgrade
                </Button>
              </Link>
            )}
          </div>

          {hasActiveSubscription && (
            <div className="border-t border-white/10 pt-4 space-y-3">
              {subscription?.payment_method_brand && subscription?.payment_method_last4 && (
                <div className="flex items-center gap-3 text-sm">
                  <CreditCard className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-300">
                    {subscription.payment_method_brand.toUpperCase()} •••• {subscription.payment_method_last4}
                  </span>
                </div>
              )}
              
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-slate-300">
                  €150/month
                </span>
              </div>

              <a
                href="https://billing.stripe.com/p/login/test_xxx" // Replace with actual portal link
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-tennis hover:text-tennis/80 transition-colors mt-2"
              >
                Manage billing
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        {/* Telegram Section */}
        {hasActiveSubscription && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Telegram Alerts</h2>
            <TelegramActivation />
          </div>
        )}

        {/* Account Info */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Account</h2>
          
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <p className="text-white">{user.email}</p>
              <p className="text-slate-500 text-sm">
                Member since {new Date(user.created_at || '').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          <Button
            onClick={handleSignOut}
            loading={loggingOut}
            variant="dark-outline"
            className="w-full justify-center"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>

        {/* Danger Zone */}
        {hasActiveSubscription && (
          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-2">Cancel Subscription</h2>
            <p className="text-slate-400 text-sm mb-4">
              You can cancel your subscription anytime. You'll keep access until the end of your current billing period.
            </p>
            <a
              href="https://billing.stripe.com/p/login/test_xxx" // Replace with actual portal link
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors"
            >
              Cancel subscription
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
