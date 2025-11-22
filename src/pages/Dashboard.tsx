import { useAuth } from '../hooks/useAuth';
import { useSubscription } from '../hooks/useSubscription';
import { SubscriptionStatus } from '../components/subscription/SubscriptionStatus';
import { Button } from '../components/ui/Button';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';

export function Dashboard() {
  const { user, signOut } = useAuth();
  const { hasActiveSubscription } = useSubscription();

  return (
    <div className="min-h-screen bg-brand-dark text-slate-200">
      <nav className="bg-brand-dark/50 border-b border-white/5 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center text-slate-400 hover:text-tennis transition-colors mr-4">
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back
              </Link>
              <h1 className="text-xl font-bold text-white tracking-tight">My Account</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-slate-400 text-sm hidden sm:inline font-mono">
                {user?.email}
              </span>
              <Button variant="dark-outline" onClick={signOut}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8">
          <div className="text-center sm:text-left">
            <h2 className="text-3xl font-bold text-white mb-2">
              Welcome, {user?.email?.split('@')[0]}
            </h2>
            <p className="text-slate-400">
              Manage your subscription and account settings.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-xl">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center">
              <Shield className="w-5 h-5 mr-2 text-tennis" />
              Subscription Status
            </h3>
            <div className="bg-brand-dark/50 p-4 rounded-lg border border-white/5">
                <SubscriptionStatus />
            </div>
          </div>

          {!hasActiveSubscription && (
            <div className="bg-accent-blue/10 border border-accent-blue/20 rounded-xl p-6">
              <h3 className="text-lg font-bold text-accent-blue mb-2">
                Upgrade to Premium
              </h3>
              <p className="text-slate-300 mb-4">
                Get access to advanced predictions, live odds, and value betting tools.
              </p>
              <Link to="/subscription">
                <Button className="bg-accent-blue text-brand-dark hover:bg-accent-blue/90 font-bold">View Plans</Button>
              </Link>
            </div>
          )}

          {hasActiveSubscription && (
            <div className="bg-tennis/10 border border-tennis/20 rounded-xl p-6">
              <h3 className="text-lg font-bold text-tennis mb-2">
                Premium Features Active
              </h3>
              <p className="text-slate-300 mb-6">
                You have full access to the SOTA V4 Model and Betting Terminal.
              </p>
              <Link to="/">
                <Button variant="tennis" className="font-bold mb-6 w-full sm:w-auto">
                    Launch Prediction Dashboard
                </Button>
              </Link>
              
              <div className="space-y-3 border-t border-white/10 pt-6">
                <div className="flex items-center text-slate-300">
                  <span className="w-2 h-2 bg-tennis rounded-full mr-3 shadow-neon"></span>
                  V4 SOTA Model Access
                </div>
                <div className="flex items-center text-slate-300">
                  <span className="w-2 h-2 bg-tennis rounded-full mr-3 shadow-neon"></span>
                  Real-time Value Betting Terminal
                </div>
                <div className="flex items-center text-slate-300">
                  <span className="w-2 h-2 bg-tennis rounded-full mr-3 shadow-neon"></span>
                  Kelly Criterion Money Management
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

