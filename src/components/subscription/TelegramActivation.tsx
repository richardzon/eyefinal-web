import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useSubscription } from '../../hooks/useSubscription';
import { supabase } from '../../lib/supabase';
import { MessageCircle, Copy, Check, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';

interface TelegramStatus {
  linked: boolean;
  username?: string;
  activated_at?: string;
  subscription_status?: string;
  alert_mode?: 'sniper' | 'balanced' | 'everything';
  sleep_mode?: boolean;
}

const ALERT_MODES = {
  sniper: {
    icon: '🎯',
    name: 'Sniper',
    description: 'Only the best',
    details: 'EV > 25%, ATP/WTA only',
    alerts: '2-5/day'
  },
  balanced: {
    icon: '⚡',
    name: 'Balanced',
    description: 'Good balance',
    details: 'EV > 15%, Top tournaments',
    alerts: '10-20/day'
  },
  everything: {
    icon: '🌊',
    name: 'Everything',
    description: 'All value bets',
    details: 'EV > 10%, All tournaments',
    alerts: '50+/day'
  }
} as const;

interface LinkCode {
  code: string;
  expires_at: string;
  already_linked?: boolean;
}

export function TelegramActivation() {
  const { user } = useAuth();
  const { hasActiveSubscription } = useSubscription();
  const [telegramStatus, setTelegramStatus] = useState<TelegramStatus | null>(null);
  const [linkCode, setLinkCode] = useState<LinkCode | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alertMode, setAlertMode] = useState<'sniper' | 'balanced' | 'everything'>('balanced');
  const [sleepMode, setSleepMode] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const BOT_USERNAME = 'acepredictorbot';
  const BOT_LINK = `https://t.me/${BOT_USERNAME}`;

  // Check Telegram status on mount
  useEffect(() => {
    if (user?.id) {
      checkTelegramStatus();
    }
  }, [user?.id]);

  const checkTelegramStatus = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Check if user has linked Telegram
      const { data: subscriber, error: subError } = await supabase
        .from('telegram_subscribers')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (subscriber && !subError) {
        setTelegramStatus({
          linked: true,
          username: subscriber.username,
          activated_at: subscriber.activated_at,
          subscription_status: subscriber.subscription_status,
          alert_mode: subscriber.alert_mode || 'balanced',
          sleep_mode: subscriber.sleep_mode || false
        });
        setAlertMode(subscriber.alert_mode || 'balanced');
        setSleepMode(subscriber.sleep_mode || false);
        setLinkCode(null);
      } else {
        setTelegramStatus({ linked: false });
        // Get or create link code
        await getOrCreateLinkCode();
      }
    } catch (err) {
      console.error('Error checking Telegram status:', err);
      setError('Failed to check Telegram status');
    } finally {
      setLoading(false);
    }
  };

  const getOrCreateLinkCode = async () => {
    if (!user?.id) return;
    
    try {
      // Check for existing valid code
      const now = new Date().toISOString();
      const { data: existingCode } = await supabase
        .from('telegram_link_codes')
        .select('*')
        .eq('user_id', user.id)
        .is('used_at', null)
        .gt('expires_at', now)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (existingCode) {
        setLinkCode({
          code: existingCode.code,
          expires_at: existingCode.expires_at
        });
        return;
      }
      
      // Generate new code
      await generateNewCode();
    } catch (err) {
      // No existing code, generate new one
      await generateNewCode();
    }
  };

  const generateNewCode = async () => {
    if (!user?.id) return;
    
    setGenerating(true);
    setError(null);
    
    try {
      // Generate code format: EYEF-XXXX-XXXX
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      const part1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      const code = `EYEF-${part1}-${part2}`;
      
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
      
      // Invalidate old codes
      await supabase
        .from('telegram_link_codes')
        .update({ expires_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .is('used_at', null);
      
      // Insert new code
      const { error: insertError } = await supabase
        .from('telegram_link_codes')
        .insert({
          code,
          user_id: user.id,
          expires_at: expiresAt
        });
      
      if (insertError) throw insertError;
      
      setLinkCode({ code, expires_at: expiresAt });
    } catch (err) {
      console.error('Error generating code:', err);
      setError('Failed to generate activation code');
    } finally {
      setGenerating(false);
    }
  };

  const copyCode = async () => {
    if (!linkCode?.code) return;
    
    try {
      await navigator.clipboard.writeText(linkCode.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatExpiryTime = (expiresAt: string) => {
    const expires = new Date(expiresAt);
    const now = new Date();
    const hoursLeft = Math.max(0, Math.floor((expires.getTime() - now.getTime()) / (1000 * 60 * 60)));
    
    if (hoursLeft < 1) return 'Expires soon';
    if (hoursLeft === 1) return 'Expires in 1 hour';
    return `Expires in ${hoursLeft} hours`;
  };

  // Don't show if no active subscription
  if (!hasActiveSubscription) {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-brand-card/50 rounded-xl p-6 border border-white/10">
        <div className="animate-pulse flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 rounded-full"></div>
          <div className="flex-1">
            <div className="h-4 bg-white/10 rounded w-1/3 mb-2"></div>
            <div className="h-3 bg-white/10 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  // Save alert settings
  const saveAlertSettings = async (newMode: 'sniper' | 'balanced' | 'everything', newSleepMode: boolean) => {
    if (!user?.id) return;
    
    setSavingSettings(true);
    try {
      const { error: updateError } = await supabase
        .from('telegram_subscribers')
        .update({ 
          alert_mode: newMode,
          sleep_mode: newSleepMode 
        })
        .eq('user_id', user.id);
      
      if (!updateError) {
        setAlertMode(newMode);
        setSleepMode(newSleepMode);
      }
    } catch (err) {
      console.error('Error saving settings:', err);
    } finally {
      setSavingSettings(false);
    }
  };

  // Already linked
  if (telegramStatus?.linked) {
    return (
      <div className="bg-gradient-to-r from-[#0088cc]/20 to-transparent rounded-xl p-6 border border-[#0088cc]/30">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-[#0088cc] rounded-full flex items-center justify-center flex-shrink-0">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              Telegram Connected
              <Check className="w-5 h-5 text-green-400" />
            </h3>
            <p className="text-slate-400 text-sm mt-1">
              Linked to @{telegramStatus.username || 'your account'}
            </p>
            
            {/* Alert Mode Selection */}
            <div className="mt-6">
              <p className="text-sm font-medium text-white mb-3">Alert Style</p>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(ALERT_MODES) as Array<keyof typeof ALERT_MODES>).map((mode) => {
                  const config = ALERT_MODES[mode];
                  const isSelected = alertMode === mode;
                  return (
                    <button
                      key={mode}
                      onClick={() => saveAlertSettings(mode, sleepMode)}
                      disabled={savingSettings}
                      className={`p-3 rounded-lg border transition-all text-center ${
                        isSelected 
                          ? 'border-[#0088cc] bg-[#0088cc]/20' 
                          : 'border-white/10 hover:border-white/30 bg-brand-dark/50'
                      } ${savingSettings ? 'opacity-50' : ''}`}
                    >
                      <div className="text-2xl mb-1">{config.icon}</div>
                      <div className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                        {config.name}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">{config.alerts}</div>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {ALERT_MODES[alertMode].details}
              </p>
            </div>
            
            {/* Sleep Mode Toggle */}
            <div className="mt-4 flex items-center justify-between p-3 bg-brand-dark/50 rounded-lg border border-white/10">
              <div>
                <p className="text-sm font-medium text-white">Sleep Mode</p>
                <p className="text-xs text-slate-500">No alerts 11pm - 7am UTC</p>
              </div>
              <button
                onClick={() => saveAlertSettings(alertMode, !sleepMode)}
                disabled={savingSettings}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  sleepMode ? 'bg-[#0088cc]' : 'bg-slate-600'
                } ${savingSettings ? 'opacity-50' : ''}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  sleepMode ? 'translate-x-7' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Not linked - show activation code
  return (
    <div className="bg-gradient-to-r from-[#0088cc]/20 to-transparent rounded-xl p-6 border border-[#0088cc]/30">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-[#0088cc] rounded-full flex items-center justify-center flex-shrink-0">
          <MessageCircle className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-white">
            Get Telegram Alerts
          </h3>
          <p className="text-slate-400 text-sm mt-1">
            Receive instant value bet notifications on your phone.
          </p>
          
          {error && (
            <div className="mt-3 text-red-400 text-sm">{error}</div>
          )}
          
          {linkCode && (
            <div className="mt-4 space-y-3">
              {/* Activation Code */}
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-brand-dark rounded-lg px-4 py-3 font-mono text-lg text-white border border-white/10">
                  {linkCode.code}
                </div>
                <button
                  onClick={copyCode}
                  className="p-3 bg-brand-dark rounded-lg border border-white/10 hover:border-[#0088cc] transition-colors"
                  title="Copy code"
                >
                  {copied ? (
                    <Check className="w-5 h-5 text-green-400" />
                  ) : (
                    <Copy className="w-5 h-5 text-slate-400" />
                  )}
                </button>
              </div>
              
              <p className="text-slate-500 text-xs">
                {formatExpiryTime(linkCode.expires_at)}
              </p>
              
              {/* Instructions */}
              <div className="bg-brand-dark/50 rounded-lg p-4 space-y-2">
                <p className="text-sm text-slate-300 font-medium">How to activate:</p>
                <ol className="text-sm text-slate-400 space-y-1 list-decimal list-inside">
                  <li>Open our Telegram bot</li>
                  <li>Paste your activation code</li>
                  <li>Start receiving alerts!</li>
                </ol>
              </div>
              
              {/* Buttons */}
              <div className="flex gap-2">
                <a
                  href={BOT_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button variant="tennis" className="w-full">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Open Telegram Bot
                    <ExternalLink className="w-3 h-3 ml-2" />
                  </Button>
                </a>
                <button
                  onClick={generateNewCode}
                  disabled={generating}
                  className="p-2 bg-brand-dark rounded-lg border border-white/10 hover:border-white/30 transition-colors disabled:opacity-50"
                  title="Generate new code"
                >
                  <RefreshCw className={`w-5 h-5 text-slate-400 ${generating ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
