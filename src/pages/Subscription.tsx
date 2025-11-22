import { stripeProducts } from '../stripe-config';
import { SubscriptionCard } from '../components/subscription/SubscriptionCard';
import { SubscriptionStatus } from '../components/subscription/SubscriptionStatus';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { ArrowLeft, Crown } from 'lucide-react';

export function Subscription() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-brand-dark flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-200">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Sign in required
          </h2>
          <p className="text-slate-400 mb-6">
            Please sign in to view subscription options.
          </p>
          <div className="space-x-4">
            <Link to="/login">
              <Button variant="tennis">Sign In</Button>
            </Link>
            <Link to="/signup">
              <Button variant="dark-outline">Sign Up</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-dark py-12 text-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header / Nav */}
        <div className="flex items-center justify-between mb-12">
            <Link to="/" className="flex items-center text-slate-400 hover:text-tennis transition-colors">
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-white flex items-center">
                <Crown className="w-6 h-6 mr-2 text-tennis" />
                Premium Access
            </h1>
        </div>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">
            Unlock SOTA Predictions
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Get the edge with our V4 AI Model, Real-time Value Betting, and Kelly Criterion Stake sizing.
          </p>
        </div>

        <div className="mb-12 glass-panel p-6 rounded-xl">
          <h2 className="text-xl font-semibold text-white mb-4">
            Current Status
          </h2>
          <div className="bg-brand-dark/50 p-4 rounded-lg border border-white/5">
            <SubscriptionStatus />
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {stripeProducts.map((product) => (
            <div key={product.id} className="glass-panel rounded-xl overflow-hidden hover:border-tennis/50 transition-all">
                <SubscriptionCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

