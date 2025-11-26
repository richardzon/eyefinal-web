import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSubscription } from '../hooks/useSubscription';
import { supabase } from '../lib/supabase';
import { 
  CheckCircle, 
  MessageCircle, 
  Copy, 
  Check, 
  ExternalLink, 
  ArrowRight,
  Sparkles,
  PartyPopper
} from 'lucide-react';
import { Button } from '../components/ui/Button';

interface LinkCode {
  code: string;
  expires_at: string;
}

export function Success() {
  const { user } = useAuth();
  const { refetch } = useSubscription();
  const [step, setStep] = useState<'welcome' | 'telegram'>('welcome');
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [linkCode, setLinkCode] = useState<LinkCode | null>(null);
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);

  const BOT_USERNAME = 'acepredictorbot';
  const BOT_LINK = `https://t.me/${BOT_USERNAME}`;

  useEffect(() => {
    // Refetch subscription after payment
    const timer = setTimeout(() => refetch(), 2000);
    return () => clearTimeout(timer);
  }, [refetch]);

  useEffect(() => {
    if (user?.id && step === 'telegram') {
      checkTelegramStatus();
      generateLinkCode();
    }
  }, [user?.id, step]);

  const checkTelegramStatus = async () => {
    if (!user?.id) return;
    
    try {
      const { data } = await supabase
        .from('telegram_subscribers')
        .select('chat_id')
        .eq('user_id', user.id)
        .single();
      
      if (data?.chat_id) {
        setTelegramLinked(true);
      }
    } catch {
      // Not linked yet
    }
  };

  const generateLinkCode = async () => {
    if (!user?.id) return;
    
    try {
      // Check for existing code
      const now = new Date().toISOString();
      const { data: existing } = await supabase
        .from('telegram_link_codes')
        .select('code, expires_at')
        .eq('user_id', user.id)
        .is('used_at', null)
        .gt('expires_at', now)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (existing) {
        setLinkCode(existing);
        return;
      }
      
      // Generate new code
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      const part1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      const code = `EYEF-${part1}-${part2}`;
      
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      
      await supabase.from('telegram_link_codes').insert({
        user_id: user.id,
        code,
        expires_at: expiresAt.toISOString()
      });
      
      setLinkCode({ code, expires_at: expiresAt.toISOString() });
    } catch (err) {
      console.error('Error generating code:', err);
    }
  };

  const copyCode = async () => {
    if (!linkCode?.code) return;
    await navigator.clipboard.writeText(linkCode.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const recheckStatus = async () => {
    setChecking(true);
    await checkTelegramStatus();
    setChecking(false);
  };

  // Welcome step
  if (step === 'welcome') {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          {/* Celebration */}
          <div className="mb-8">
            <div className="w-20 h-20 bg-tennis/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <PartyPopper className="w-10 h-10 text-tennis" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Welcome to Premium!</h1>
            <p className="text-slate-400">Your subscription is now active</p>
          </div>

          {/* What's next */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6 text-left">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-tennis" />
              What's Next
            </h2>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-tennis flex-shrink-0 mt-0.5" />
                <span className="text-slate-300">Full access to AI predictions</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full border-2 border-slate-500 flex-shrink-0 mt-0.5" />
                <span className="text-slate-300">Connect Telegram for instant alerts</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full border-2 border-slate-500 flex-shrink-0 mt-0.5" />
                <span className="text-slate-300">Customize your alert preferences</span>
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              onClick={() => setStep('telegram')}
              size="lg"
              className="w-full bg-[#0088cc] hover:bg-[#0088cc]/90 text-white font-semibold py-4 rounded-xl"
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              Connect Telegram
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            
            <Link to="/" className="block">
              <Button
                variant="dark-outline"
                size="lg"
                className="w-full py-4 rounded-xl"
              >
                Skip for now
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Telegram step
  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#0088cc] rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Connect Telegram</h1>
          <p className="text-slate-400">Get instant value bet alerts on your phone</p>
        </div>

        {telegramLinked ? (
          // Success state
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 text-center mb-6">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h2 className="text-xl font-semibold text-white mb-2">Connected!</h2>
            <p className="text-slate-400 text-sm mb-4">
              You'll now receive alerts when value bets are detected
            </p>
            <Link to="/account">
              <Button className="bg-tennis hover:bg-tennis/90 text-black font-semibold">
                Customize Alert Settings
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        ) : (
          // Link flow
          <div className="space-y-4">
            {/* Step 1 */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-[#0088cc]/20 rounded-full flex items-center justify-center text-[#0088cc] font-bold text-sm">
                  1
                </div>
                <h3 className="text-white font-medium">Open our Telegram bot</h3>
              </div>
              <a
                href={BOT_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-[#0088cc] hover:bg-[#0088cc]/90 text-white font-medium py-3 rounded-lg transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                Open @{BOT_USERNAME}
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            {/* Step 2 */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-[#0088cc]/20 rounded-full flex items-center justify-center text-[#0088cc] font-bold text-sm">
                  2
                </div>
                <h3 className="text-white font-medium">Send this activation code</h3>
              </div>
              
              {linkCode ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-brand-dark rounded-lg px-4 py-3 font-mono text-lg text-white border border-white/10 text-center">
                    {linkCode.code}
                  </div>
                  <button
                    onClick={copyCode}
                    className="p-3 bg-brand-dark rounded-lg border border-white/10 hover:border-[#0088cc] transition-colors"
                  >
                    {copied ? (
                      <Check className="w-5 h-5 text-green-400" />
                    ) : (
                      <Copy className="w-5 h-5 text-slate-400" />
                    )}
                  </button>
                </div>
              ) : (
                <div className="h-12 bg-brand-dark rounded-lg animate-pulse" />
              )}
            </div>

            {/* Step 3 */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-[#0088cc]/20 rounded-full flex items-center justify-center text-[#0088cc] font-bold text-sm">
                  3
                </div>
                <h3 className="text-white font-medium">Verify connection</h3>
              </div>
              <Button
                onClick={recheckStatus}
                loading={checking}
                className="w-full bg-white/10 hover:bg-white/20 text-white py-3 rounded-lg"
              >
                {checking ? 'Checking...' : 'I\'ve sent the code'}
              </Button>
            </div>
          </div>
        )}

        {/* Skip */}
        {!telegramLinked && (
          <div className="mt-6 text-center">
            <Link to="/" className="text-slate-400 hover:text-white text-sm transition-colors">
              Skip and go to dashboard
            </Link>
          </div>
        )}

        {/* Go to dashboard if linked */}
        {telegramLinked && (
          <div className="mt-4 text-center">
            <Link to="/">
              <Button variant="dark-outline" className="w-full py-3 rounded-xl">
                Go to Dashboard
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
