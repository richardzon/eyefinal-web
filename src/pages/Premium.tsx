import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSubscription } from '../hooks/useSubscription';
import { createCheckoutSession, redirectToCheckout } from '../services/stripe';
import { TelegramActivation } from '../components/subscription/TelegramActivation';
import { Button } from '../components/ui/Button';
import { 
  ArrowLeft, 
  Crown, 
  Zap, 
  Target, 
  TrendingUp, 
  Bell, 
  Shield, 
  BarChart3,
  Check,
  Sparkles,
  Brain,
  MessageCircle
} from 'lucide-react';

const FEATURES = [
  {
    icon: Brain,
    title: 'V4 AI Model',
    description: 'State-of-the-art neural network trained on 500K+ matches',
    highlight: true
  },
  {
    icon: Target,
    title: 'Value Bet Detection',
    description: 'Automatic edge calculation vs bookmaker odds'
  },
  {
    icon: TrendingUp,
    title: 'Kelly Criterion',
    description: 'Optimal stake sizing for bankroll growth'
  },
  {
    icon: Bell,
    title: 'Instant Telegram Alerts',
    description: 'Real-time notifications when value bets appear'
  },
  {
    icon: BarChart3,
    title: 'Live Match Tracking',
    description: 'Real-time scores and in-play analysis'
  },
  {
    icon: Shield,
    title: 'Retirement Warnings',
    description: 'Player injury & retirement risk detection'
  }
];

const STATS = [
  { value: '67%', label: 'Win Rate', sublabel: 'Last 30 days' },
  { value: '+18%', label: 'ROI', sublabel: 'Average monthly' },
  { value: '500K+', label: 'Matches', sublabel: 'Training data' },
  { value: '<5min', label: 'Alert Speed', sublabel: 'New odds detected' }
];

const TESTIMONIALS = [
  {
    quote: "Finally a tennis predictor that actually works. The value bet alerts are a game changer.",
    author: "Pro Bettor",
    profit: "+€2,340 this month"
  },
  {
    quote: "The Kelly staking saved my bankroll. No more emotional betting.",
    author: "Sports Trader",
    profit: "+€890 this month"
  }
];

export function Premium() {
  const { isAuthenticated } = useAuth();
  const { hasActiveSubscription, subscription, loading: subLoading } = useSubscription();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async () => {
    if (!isAuthenticated) {
      window.location.href = '/login?redirect=/premium';
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { url } = await createCheckoutSession({
        price_id: 'price_1SVhsNGYrToXBLkjCnx4eXuE',
        mode: 'subscription',
        success_url: `${window.location.origin}/success`,
        cancel_url: window.location.href,
      });
      redirectToCheckout(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
      setLoading(false);
    }
  };

  const formatRenewalDate = () => {
    if (!subscription?.current_period_end) return null;
    return new Date(subscription.current_period_end * 1000).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-brand-dark">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-tennis/20 via-transparent to-purple-500/10" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-tennis/5 rounded-full blur-3xl" />
        
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-20">
          {/* Nav */}
          <div className="flex items-center justify-between mb-16">
            <Link to="/" className="flex items-center text-slate-400 hover:text-tennis transition-colors">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Dashboard
            </Link>
          </div>

          {/* Hero Content */}
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-tennis/10 border border-tennis/30 rounded-full px-4 py-2 mb-6">
              <Sparkles className="w-4 h-4 text-tennis" />
              <span className="text-tennis text-sm font-medium">V4 Model Now Live</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 tracking-tight">
              Beat the Bookies with
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-tennis to-emerald-400">
                AI-Powered Tennis Predictions
              </span>
            </h1>
            
            <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
              Our neural network analyzes every match in real-time, finding value bets 
              the bookmakers miss. Get instant alerts straight to Telegram.
            </p>

            {/* CTA Section */}
            {!subLoading && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
                {hasActiveSubscription ? (
                  <div className="bg-gradient-to-r from-tennis/20 to-emerald-500/20 border border-tennis/30 rounded-2xl px-8 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-tennis/20 rounded-full flex items-center justify-center">
                        <Crown className="w-5 h-5 text-tennis" />
                      </div>
                      <div className="text-left">
                        <p className="text-white font-semibold">Premium Active</p>
                        <p className="text-slate-400 text-sm">
                          {subscription?.cancel_at_period_end ? 'Expires' : 'Renews'} {formatRenewalDate()}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <Button
                      onClick={handleSubscribe}
                      loading={loading}
                      size="lg"
                      className="bg-gradient-to-r from-tennis to-emerald-500 hover:from-tennis/90 hover:to-emerald-500/90 text-black font-bold px-8 py-4 text-lg rounded-xl shadow-lg shadow-tennis/25"
                    >
                      <Zap className="w-5 h-5 mr-2" />
                      Start Premium - €150/month
                    </Button>
                    <p className="text-slate-500 text-sm">Cancel anytime • Instant access</p>
                  </>
                )}
              </div>
            )}

            {error && (
              <div className="text-red-400 text-sm mb-4">{error}</div>
            )}
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {STATS.map((stat, i) => (
              <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-slate-300 text-sm font-medium">{stat.label}</div>
                <div className="text-slate-500 text-xs">{stat.sublabel}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-gradient-to-b from-transparent to-black/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Everything You Need to Win</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Professional-grade tools that give you the same edge as sharp bettors
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, i) => (
              <div 
                key={i} 
                className={`group relative bg-white/5 backdrop-blur-sm border rounded-xl p-6 transition-all hover:bg-white/10 ${
                  feature.highlight 
                    ? 'border-tennis/50 shadow-lg shadow-tennis/10' 
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                {feature.highlight && (
                  <div className="absolute -top-3 left-4 bg-tennis text-black text-xs font-bold px-3 py-1 rounded-full">
                    NEW
                  </div>
                )}
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${
                  feature.highlight ? 'bg-tennis/20' : 'bg-white/10'
                }`}>
                  <feature.icon className={`w-6 h-6 ${feature.highlight ? 'text-tennis' : 'text-slate-300'}`} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">How It Works</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-tennis/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Brain className="w-8 h-8 text-tennis" />
              </div>
              <div className="text-tennis font-bold text-sm mb-2">STEP 1</div>
              <h3 className="text-xl font-semibold text-white mb-2">AI Analyzes</h3>
              <p className="text-slate-400 text-sm">
                Our model processes player stats, surface, form, and 50+ features for every match
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-tennis/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-tennis" />
              </div>
              <div className="text-tennis font-bold text-sm mb-2">STEP 2</div>
              <h3 className="text-xl font-semibold text-white mb-2">Value Detected</h3>
              <p className="text-slate-400 text-sm">
                We compare our probabilities to bookmaker odds and find edges of 10%+
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-tennis/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-tennis" />
              </div>
              <div className="text-tennis font-bold text-sm mb-2">STEP 3</div>
              <h3 className="text-xl font-semibold text-white mb-2">Instant Alert</h3>
              <p className="text-slate-400 text-sm">
                You get a Telegram notification with the bet, odds, and recommended stake
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Telegram Section (for subscribers) */}
      {hasActiveSubscription && (
        <div className="py-12 bg-gradient-to-b from-transparent to-[#0088cc]/10">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Configure Your Alerts</h2>
              <p className="text-slate-400">Customize which value bets you want to receive</p>
            </div>
            <TelegramActivation />
          </div>
        </div>
      )}

      {/* Testimonials */}
      <div className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-6">
                <p className="text-slate-300 mb-4 italic">"{t.quote}"</p>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-sm">{t.author}</span>
                  <span className="text-tennis font-semibold text-sm">{t.profit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Final CTA */}
      {!hasActiveSubscription && (
        <div className="py-20 bg-gradient-to-t from-tennis/10 to-transparent">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Start Winning?
            </h2>
            <p className="text-slate-400 mb-8 max-w-xl mx-auto">
              Join hundreds of profitable bettors using our AI predictions
            </p>
            
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 max-w-md mx-auto">
              <div className="text-tennis font-bold text-sm mb-2">PREMIUM</div>
              <div className="text-5xl font-bold text-white mb-2">€150<span className="text-xl text-slate-400">/mo</span></div>
              
              <ul className="text-left space-y-3 my-6">
                {['Full AI predictions access', 'Real-time Telegram alerts', 'Kelly stake calculator', 'Value bet detection', 'Priority support'].map((item, i) => (
                  <li key={i} className="flex items-center text-slate-300">
                    <Check className="w-5 h-5 text-tennis mr-3 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>

              <Button
                onClick={handleSubscribe}
                loading={loading}
                size="lg"
                className="w-full bg-gradient-to-r from-tennis to-emerald-500 hover:from-tennis/90 hover:to-emerald-500/90 text-black font-bold py-4 text-lg rounded-xl"
              >
                Get Started Now
              </Button>
              
              <p className="text-slate-500 text-xs mt-4">
                Secure payment via Stripe • Cancel anytime
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="py-8 border-t border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-500 text-sm">
          <p>© 2025 Ace Predictor. Gamble responsibly.</p>
        </div>
      </div>
    </div>
  );
}
