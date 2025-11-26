import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { Settings, Check } from 'lucide-react';

interface AlertSettings {
  preset: 'sniper' | 'balanced' | 'everything' | 'custom';
  min_ev: number;
  min_confidence: number;
  bookmakers: string[];
  tournaments: string[];
  sleep_mode: boolean;
}

const DEFAULT_SETTINGS: AlertSettings = {
  preset: 'balanced',
  min_ev: 0.15,
  min_confidence: 0.55,
  bookmakers: [],
  tournaments: ['Atp', 'Wta', 'Challenger'],
  sleep_mode: false
};

const PRESETS: Record<string, { icon: string; name: string; alerts: string; settings: Partial<AlertSettings> }> = {
  sniper: {
    icon: '🎯',
    name: 'Sniper',
    alerts: '2-5/day',
    settings: { min_ev: 0.25, min_confidence: 0.65, tournaments: ['Atp', 'Wta'], bookmakers: [] }
  },
  balanced: {
    icon: '⚡',
    name: 'Balanced',
    alerts: '10-20/day',
    settings: { min_ev: 0.15, min_confidence: 0.55, tournaments: ['Atp', 'Wta', 'Challenger'], bookmakers: [] }
  },
  everything: {
    icon: '🌊',
    name: 'Everything',
    alerts: '50+/day',
    settings: { min_ev: 0.10, min_confidence: 0.50, tournaments: [], bookmakers: [] }
  }
};

const BOOKMAKERS = [
  { id: '1xBet', name: '1xBet' },
  { id: 'Bet365', name: 'Bet365' },
  { id: 'Pinnacle', name: 'Pinnacle' },
  { id: 'Unibet', name: 'Unibet' },
  { id: 'WilliamHill', name: 'William Hill' },
  { id: 'Betfair', name: 'Betfair' },
];

const TOURNAMENTS = [
  { id: 'Atp', name: 'ATP' },
  { id: 'Wta', name: 'WTA' },
  { id: 'Challenger', name: 'Challenger' },
  { id: 'Itf', name: 'ITF' },
];

interface TelegramSettingsProps {
  userId: string;
}

export function TelegramSettings({ userId }: TelegramSettingsProps) {
  const [settings, setSettings] = useState<AlertSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [userId]);

  const loadSettings = async () => {
    try {
      const { data } = await supabase
        .from('telegram_subscribers')
        .select('alert_settings')
        .eq('user_id', userId)
        .single();
      
      if (data?.alert_settings) {
        setSettings({ ...DEFAULT_SETTINGS, ...data.alert_settings });
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    }
  };

  const saveSettings = async (newSettings: AlertSettings) => {
    setSaving(true);
    try {
      await supabase
        .from('telegram_subscribers')
        .update({ alert_settings: newSettings })
        .eq('user_id', userId);
      
      setSettings(newSettings);
    } catch (err) {
      console.error('Error saving settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = (presetName: string) => {
    const preset = PRESETS[presetName];
    if (preset) {
      const newSettings: AlertSettings = {
        ...DEFAULT_SETTINGS,
        ...preset.settings,
        preset: presetName as AlertSettings['preset'],
        sleep_mode: settings.sleep_mode
      };
      saveSettings(newSettings);
    }
  };

  const updateSetting = <K extends keyof AlertSettings>(key: K, value: AlertSettings[K]) => {
    const newSettings: AlertSettings = {
      ...settings,
      [key]: value,
      preset: 'custom'
    };
    saveSettings(newSettings);
  };

  const toggleArrayItem = (key: 'bookmakers' | 'tournaments', item: string) => {
    const current = settings[key];
    const newValue = current.includes(item)
      ? current.filter(i => i !== item)
      : [...current, item];
    updateSetting(key, newValue);
  };

  return (
    <div className="space-y-6">
      {/* Quick Presets */}
      <div>
        <p className="text-sm font-medium text-white mb-3">Quick Presets</p>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(PRESETS).map(([key, preset]) => {
            const isSelected = settings.preset === key;
            return (
              <button
                key={key}
                onClick={() => applyPreset(key)}
                disabled={saving}
                className={`p-3 rounded-lg border transition-all text-center ${
                  isSelected 
                    ? 'border-tennis bg-tennis/20' 
                    : 'border-white/10 hover:border-white/30 bg-brand-dark/50'
                } ${saving ? 'opacity-50' : ''}`}
              >
                <div className="text-2xl mb-1">{preset.icon}</div>
                <div className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                  {preset.name}
                </div>
                <div className="text-xs text-slate-500 mt-1">{preset.alerts}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Advanced Toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
      >
        <Settings className="w-4 h-4" />
        {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
        {settings.preset === 'custom' && (
          <span className="text-xs bg-tennis/20 text-tennis px-2 py-0.5 rounded">Custom</span>
        )}
      </button>

      {/* Advanced Settings */}
      {showAdvanced && (
        <div className="space-y-5 p-4 bg-brand-dark/50 rounded-lg border border-white/10">
          {/* Min EV Slider */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-300">Minimum EV</span>
              <span className="text-white font-medium">{Math.round(settings.min_ev * 100)}%</span>
            </div>
            <input
              type="range"
              min="5"
              max="50"
              value={settings.min_ev * 100}
              onChange={(e) => updateSetting('min_ev', parseInt(e.target.value) / 100)}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-tennis"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>5%</span>
              <span>50%</span>
            </div>
          </div>

          {/* Min Confidence Slider */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-300">Minimum Model Confidence</span>
              <span className="text-white font-medium">{Math.round(settings.min_confidence * 100)}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="90"
              value={settings.min_confidence * 100}
              onChange={(e) => updateSetting('min_confidence', parseInt(e.target.value) / 100)}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-tennis"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>50%</span>
              <span>90%</span>
            </div>
          </div>

          {/* Tournaments */}
          <div>
            <p className="text-sm text-slate-300 mb-2">Tournaments</p>
            <div className="flex flex-wrap gap-2">
              {TOURNAMENTS.map((t) => {
                const isSelected = settings.tournaments.length === 0 || settings.tournaments.includes(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => toggleArrayItem('tournaments', t.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                      isSelected
                        ? 'bg-tennis/20 text-tennis border border-tennis/50'
                        : 'bg-slate-800 text-slate-400 border border-transparent hover:border-white/20'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 inline mr-1" />}
                    {t.name}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {settings.tournaments.length === 0 ? 'All tournaments' : `${settings.tournaments.length} selected`}
            </p>
          </div>

          {/* Bookmakers */}
          <div>
            <p className="text-sm text-slate-300 mb-2">Preferred Bookmakers</p>
            <div className="flex flex-wrap gap-2">
              {BOOKMAKERS.map((b) => {
                const isSelected = settings.bookmakers.length === 0 || settings.bookmakers.includes(b.id);
                return (
                  <button
                    key={b.id}
                    onClick={() => toggleArrayItem('bookmakers', b.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                      isSelected
                        ? 'bg-tennis/20 text-tennis border border-tennis/50'
                        : 'bg-slate-800 text-slate-400 border border-transparent hover:border-white/20'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 inline mr-1" />}
                    {b.name}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {settings.bookmakers.length === 0 ? 'Any bookmaker' : `${settings.bookmakers.length} selected`}
            </p>
          </div>
        </div>
      )}

      {/* Sleep Mode */}
      <div className="flex items-center justify-between p-3 bg-brand-dark/50 rounded-lg border border-white/10">
        <div>
          <p className="text-sm font-medium text-white">Sleep Mode</p>
          <p className="text-xs text-slate-500">No alerts 11pm - 7am UTC</p>
        </div>
        <button
          onClick={() => updateSetting('sleep_mode', !settings.sleep_mode)}
          disabled={saving}
          className={`w-12 h-6 rounded-full transition-colors relative ${
            settings.sleep_mode ? 'bg-tennis' : 'bg-slate-600'
          } ${saving ? 'opacity-50' : ''}`}
        >
          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
            settings.sleep_mode ? 'translate-x-7' : 'translate-x-1'
          }`} />
        </button>
      </div>
    </div>
  );
}
