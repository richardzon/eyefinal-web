import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSubscription } from '../hooks/useSubscription';
import { createCheckoutSession, redirectToCheckout } from '../services/stripe';
import { Button } from '../components/ui/Button';
import { 
  ArrowLeft, 
  Zap, 
  Target, 
  TrendingUp, 
  Bell, 
  Shield, 
  BarChart3,
  Check,
  Sparkles,
  Brain,
  MessageCircle,
  ArrowRight,
  Star
} from 'lucide-react';

const FEATURES = [
  { icon: Brain, title: 'V4 AI Model', desc: 'Neural network trained on 500K+ matches' },
  { icon: Target, title: 'Value Detection', desc: 'Find edges bookmakers miss' },
  { icon: TrendingUp, title: 'Kelly Staking', desc: 'Optimal bankroll management' },
  { icon: Bell, title: 'Telegram Alerts', desc: 'Instant notifications to your phone' },
  { icon: BarChart3, title: 'Live Tracking', desc: 'Real-time scores & analysis' },
  { icon: Shield, title: 'Risk Warnings', desc: 'Retirement & injury detection' },
];

const INCLUDED = [
  'Full AI predictions for all matches',
  'Real-time value bet alerts via Telegram',
  'Kelly Criterion stake calculator',
  'Customizable alert filters',
  'Live match tracking',
  'Priority support'
];

export function Premium() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { hasActiveSubscription, loading: subLoading } = useSubscription();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already subscribed, redirect to account
  if (!subLoading && hasActiveSubscription) {
    navigate('/account');
    return null;
  }

  const handleSubscribe = async () => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/premium');
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
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark">
      {/* Nav */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <Link to="/" className="inline-flex items-center text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Link>
      </div>

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-tennis/10 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-tennis/5 rounded-full blur-3xl" />
        
        <div className="relative max-w-4xl mx-auto px-4 pt-8 pb-16 text-center">
          <div className="inline-flex items-center gap-2 bg-tennis/10 border border-tennis/30 rounded-full px-4 py-1.5 mb-6">
            <Sparkles className="w-4 h-4 text-tennis" />
            <span className="text-tennis text-sm font-medium">V4 Model Now Live</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            Win More with AI Tennis Predictions
          </h1>
          
          <p className="text-lg text-slate-400 mb-8 max-w-2xl mx-auto">
            Our neural network finds value bets in real-time and sends them straight to your Telegram.
          </p>

          {/* Price Card */}
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8 max-w-sm mx-auto mb-8">
            <div className="text-5xl font-bold text-white mb-1">
              €150<span className="text-lg text-slate-400 font-normal">/mo</span>
            </div>
            <p className="text-slate-400 text-sm mb-6">Cancel anytime</p>
            
            <Button
              onClick={handleSubscribe}
              loading={loading}
              size="lg"
              className="w-full bg-tennis hover:bg-tennis/90 text-black font-bold py-4 text-lg rounded-xl mb-4"
            >
              <Zap className="w-5 h-5 mr-2" />
              {isAuthenticated ? 'Start Premium' : 'Sign Up & Subscribe'}
            </Button>
            
            {error && <p className="text-red-400 text-sm">{error}</p>}
            
            <p className="text-slate-500 text-xs">
              Secure payment via Stripe
            </p>
          </div>

          {/* Trust */}
          <div className="flex items-center justify-center gap-6 text-sm text-slate-400">
            <span className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-500" /> 67% Win Rate
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-green-500" /> +18% ROI
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="w-4 h-4 text-[#0088cc]" /> Instant Alerts
            </span>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-white text-center mb-10">Everything You Get</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-5 hover:border-white/20 transition-colors">
              <f.icon className="w-8 h-8 text-tennis mb-3" />
              <h3 className="text-white font-semibold mb-1">{f.title}</h3>
              <p className="text-slate-400 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-white/[0.02] border-y border-white/10 py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-white text-center mb-10">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { num: '1', title: 'Subscribe', desc: 'Get instant access to all predictions' },
              { num: '2', title: 'Connect Telegram', desc: 'Link your account in 30 seconds' },
              { num: '3', title: 'Get Alerts', desc: 'Receive value bets as they appear' },
            ].map((step, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 bg-tennis/20 rounded-full flex items-center justify-center mx-auto mb-4 text-tennis font-bold text-xl">
                  {step.num}
                </div>
                <h3 className="text-white font-semibold mb-2">{step.title}</h3>
                <p className="text-slate-400 text-sm">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* What's Included */}
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="bg-gradient-to-br from-tennis/10 to-transparent border border-tennis/20 rounded-2xl p-8">
          <h2 className="text-xl font-bold text-white mb-6">What's Included</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {INCLUDED.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <Check className="w-5 h-5 text-tennis flex-shrink-0" />
                <span className="text-slate-300">{item}</span>
              </div>
            ))}
          </div>
          
          <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-3xl font-bold text-white">€150</span>
              <span className="text-slate-400">/month</span>
            </div>
            <Button
              onClick={handleSubscribe}
              loading={loading}
              size="lg"
              className="bg-tennis hover:bg-tennis/90 text-black font-bold px-8 rounded-xl"
            >
              Get Started <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-3xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-bold text-white text-center mb-8">Questions?</h2>
        <div className="space-y-4">
          {[
            { q: 'How do I receive alerts?', a: 'After subscribing, you\'ll connect your Telegram account. Alerts are sent instantly when value bets are detected.' },
            { q: 'Can I customize which alerts I get?', a: 'Yes! You can filter by minimum EV, confidence level, tournaments, and preferred bookmakers.' },
            { q: 'What\'s the cancellation policy?', a: 'Cancel anytime from your account. You\'ll keep access until the end of your billing period.' },
          ].map((faq, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-5">
              <h3 className="text-white font-medium mb-2">{faq.q}</h3>
              <p className="text-slate-400 text-sm">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/10 py-6">
        <p className="text-center text-slate-500 text-sm">
          © 2025 Ace Predictor • Gamble responsibly
        </p>
      </div>
    </div>
  );
}
