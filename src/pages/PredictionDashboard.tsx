import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { AlertCircle, TrendingUp, Calendar, Crown, Activity, Trophy, LayoutGrid, Clock, Filter, ChevronDown, ChevronRight, ChevronUp, DollarSign, Zap, Timer, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { useSubscription } from '../hooks/useSubscription';

interface Prediction {
  event_key: string;
  Match: string;
  'Predicted Winner': string;
  'Winner Is P1': boolean;
  Tournament: string;
  Surface: string;
  Probability: number;
  'Elo Diff': number;
  'Surf Elo Diff': number;
  H2H: string;
  Fatigue: string;
  Streak: string;
  Age: string;
  'Serve%': string;
  event_date: string;
  event_time: string | undefined;
  status: string;
  // Live status from API (not guessed from timezone)
  event_live?: boolean;
  event_status?: string;
  live_score?: {
    sets: Array<{ set: string; p1: string; p2: string }>;
    current_game: string;
    serving: string | null;
  };
  // Retirement tracking (V6 feature)
  retirement_warning?: string;
  p1_days_since_retirement?: number;
  p2_days_since_retirement?: number;
  // Bookmaker odds (V6 feature)
  odds_data?: Record<string, { p1: number; p2: number }>;
}

interface ValueBet {
  Match: string;
  'Bet On': string;
  Odds: number;
  'Model Prob': number;
  EV: number;
  Bookmaker: string;
  StakeAmount: number;
  StakePct: number;
  ExpectedProfit: number;
}

type ViewMode = 'tournament' | 'confidence' | 'time';

export function PredictionDashboard() {
  const { user } = useAuth();
  const { isSubscribed, loading: subLoading } = useSubscription();
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [predictions, setPredictions] = useState<Prediction[] | null>(null);
  const [valueBets, setValueBets] = useState<ValueBet[] | null>(null);
  const [evThreshold, setEvThreshold] = useState(0);
  const [bankroll, setBankroll] = useState(() => {
      const saved = localStorage.getItem('eye_bankroll');
      return saved ? parseFloat(saved) : 1000;
  });
  
  useEffect(() => {
      localStorage.setItem('eye_bankroll', bankroll.toString());
  }, [bankroll]);

  const [sortConfig, setSortConfig] = useState<{ key: keyof ValueBet; direction: 'asc' | 'desc' } | null>({ key: 'EV', direction: 'desc' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Organization State
  const [viewMode, setViewMode] = useState<ViewMode>('tournament');
  const [highConfidenceOnly, setHighConfidenceOnly] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  
  // Bookmaker selection (V6 feature)
  const [selectedBookmaker, setSelectedBookmaker] = useState<string>(() => {
    return localStorage.getItem('eye_bookmaker') || 'all';
  });
  const [availableBookmakers, setAvailableBookmakers] = useState<string[]>([]);

  const toggleGroup = (key: string) => {
      setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleAll = (expand: boolean) => {
      if (!predictions) return;
      const groups = getGroupedPredictions(); // We need keys
      const keys = Object.keys(groups);
      const newState: Record<string, boolean> = {};
      keys.forEach(k => newState[k] = expand);
      setExpandedGroups(newState);
  };

  const handleSort = (key: keyof ValueBet) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const handlePredictMatches = async () => {
    setLoading(true);
    setError(null);
    try {
      const startDate = `${selectedDate}T00:00:00`;
      const endDate = `${selectedDate}T23:59:59`;

      const { data: matches, error: matchError } = await supabase
        .from('matches')
        .select('*')
        .gte('event_date', startDate)
        .lte('event_date', endDate);

      if (matchError) throw matchError;
      if (!matches || matches.length === 0) {
        setPredictions([]);
        return;
      }

      const eventKeys = matches.map(m => m.event_key);

      const { data: preds, error: predError } = await supabase
        .from('predictions')
        .select('*')
        .in('event_key', eventKeys)
        .eq('model_version', 'v7.1_travel_aware');

      if (predError) throw predError;

      const matchMap = new Map(matches.map(m => [m.event_key, m]));
      
      const formattedPredictions: Prediction[] = preds.map(p => {
        const m = matchMap.get(p.event_key);
        if (!m) return null;

        const winnerIsP1 = p.predicted_winner === m.first_player_name;
        const prob = winnerIsP1 ? p.prob_p1 : p.prob_p2;

        // Use real live status from API if available (event_live from livescore sync)
        // This is the source of truth - no timezone guessing needed!
        const realStatus = m.event_live ? (m.event_status || 'Live') : 
                          (m.winner ? 'Finished' : 'Upcoming');

        return {
          event_key: p.event_key,
          Match: `${m.first_player_name} vs ${m.second_player_name}`,
          'Predicted Winner': p.predicted_winner,
          'Winner Is P1': winnerIsP1,
          Tournament: m.tournament_name || 'Unknown',
          Surface: m.surface || 'Unknown',
          Probability: prob,
          'Elo Diff': p.elo_diff_overall,
          'Surf Elo Diff': p.elo_diff_surface,
          H2H: 'View', Fatigue: 'View', Streak: 'View', Age: 'View', 'Serve%': 'View',
          event_date: m.event_date,
          event_time: m.event_time,
          status: realStatus,
          // Pass through real live data from API
          event_live: m.event_live || false,
          event_status: m.event_status,
          live_score: m.live_score,
          // Retirement tracking (V6 feature)
          retirement_warning: p.retirement_warning,
          p1_days_since_retirement: p.p1_days_since_retirement,
          p2_days_since_retirement: p.p2_days_since_retirement,
          // Bookmaker odds (V6 feature)
          odds_data: m.odds_data || {}
        };
      }).filter((p): p is Prediction => p !== null);

      // Initial sorting is less important as we will group them, but good for 'time' view
      formattedPredictions.sort((a, b) => {
          if (a.event_time && b.event_time) { return a.event_time.localeCompare(b.event_time); }
          return 0;
      });

      setPredictions(formattedPredictions);
      
      // Extract available bookmakers from Home/Away market (match winner odds)
      const bookieSet = new Set<string>();
      formattedPredictions.forEach(p => {
        if (p.odds_data && p.odds_data['Home/Away']) {
          const homeAway = p.odds_data['Home/Away'] as Record<string, Record<string, string>>;
          if (homeAway['Home']) Object.keys(homeAway['Home']).forEach(bookie => bookieSet.add(bookie));
          if (homeAway['Away']) Object.keys(homeAway['Away']).forEach(bookie => bookieSet.add(bookie));
        }
      });
      setAvailableBookmakers(Array.from(bookieSet).sort());
      
      const visibleEventKeys = formattedPredictions.map(p => p.event_key);
      if (visibleEventKeys.length > 0) {
          await fetchValueBets(visibleEventKeys);
      } else {
          setValueBets([]);
      }

    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchValueBets = async (eventKeys: string[]) => {
    const { data: bets } = await supabase.from('value_bets').select('*').in('event_key', eventKeys);
    if (bets) {
        const { data: matches } = await supabase.from('matches').select('event_key, first_player_name, second_player_name').in('event_key', eventKeys);
        const nameMap = new Map(matches?.map(m => [m.event_key, `${m.first_player_name} vs ${m.second_player_name}`]) || []);

        const formattedBets: ValueBet[] = bets.map(b => ({
            Match: nameMap.get(b.event_key) || 'Unknown',
            'Bet On': b.player_name,
            Odds: b.odds,
            'Model Prob': b.prob * 100,
            EV: b.ev * 100,
            Bookmaker: b.bookmaker || 'Best',
            StakeAmount: b.stake_amount || 0,
            StakePct: (b.kelly_fraction || 0) * 100,
            ExpectedProfit: b.expected_profit || 0
        }));
        setValueBets(formattedBets);
    }
  };

  useEffect(() => { handlePredictMatches(); }, [selectedDate]);

  // Filter value bets by selected bookmaker and EV threshold
  let filteredBets = valueBets?.filter(bet => {
    // CRITICAL: Only show bets where model confidence is >= 55%
    // Betting on underdogs with "positive EV" but low prob loses money
    if (bet['Model Prob'] < 55) return false;
    // Filter by EV threshold
    if (bet.EV < evThreshold) return false;
    // Filter by selected bookmaker (case-insensitive match) - "all" shows everything
    if (selectedBookmaker.toLowerCase() === 'all') return true;
    const betBookie = bet.Bookmaker.toLowerCase().replace(/\s+/g, '');
    const selectedBookie = selectedBookmaker.toLowerCase().replace(/\s+/g, '');
    return betBookie === selectedBookie || betBookie.includes(selectedBookie) || selectedBookie.includes(betBookie);
  }) || [];
  if (sortConfig !== null) {
    filteredBets.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  // --- RENDER HELPERS ---
  const getConfidenceColor = (prob: number) => {
      if (prob > 0.8) return 'text-tennis'; // Neon Yellow
      if (prob > 0.6) return 'text-accent-green';
      return 'text-slate-400';
  };

  const getSurfaceColor = (surface: string) => {
      const s = surface.toLowerCase();
      if (s.includes('hard')) return 'bg-accent-blue/20 text-accent-blue border-accent-blue/30';
      if (s.includes('clay')) return 'bg-accent-orange/20 text-accent-orange border-accent-orange/30';
      if (s.includes('grass')) return 'bg-accent-green/20 text-accent-green border-accent-green/30';
      return 'bg-slate-700 text-slate-300 border-slate-600';
  };

  // --- GROUPING LOGIC ---
  const getGroupedPredictions = () => {
      if (!predictions) return {};
      
      let filtered = predictions;
      
      // Filter by selected bookmaker - only show matches with odds from this bookie (skip if "all")
      if (selectedBookmaker.toLowerCase() !== 'all') {
        filtered = filtered.filter(p => p.odds_data && p.odds_data[selectedBookmaker]);
      }
      
      if (highConfidenceOnly) {
          filtered = filtered.filter(p => p.Probability > 0.60);
      }

      const groups: Record<string, Prediction[]> = {};

      if (viewMode === 'tournament') {
          filtered.forEach(p => {
              const key = p.Tournament;
              if (!groups[key]) groups[key] = [];
              groups[key].push(p);
          });
      } else if (viewMode === 'confidence') {
          // Buckets: "Very High (>80%)", "High (>70%)", "Medium (>60%)", "Low (<60%)"
          filtered.forEach(p => {
              let key = 'Low Confidence';
              if (p.Probability > 0.8) key = '🔥 Very High (>80%)';
              else if (p.Probability > 0.7) key = '✅ High (>70%)';
              else if (p.Probability > 0.6) key = '⚠️ Medium (>60%)';
              if (!groups[key]) groups[key] = [];
              groups[key].push(p);
          });
          // Sort buckets? We want Order: Very High -> High -> Medium -> Low
          // We can handle render order later.
      } else {
          // Time: "00:00", "01:00" etc.
          filtered.forEach(p => {
              const key = p.event_time || 'Unknown Time';
              if (!groups[key]) groups[key] = [];
              groups[key].push(p);
          });
      }
      
      // Sort matches inside groups (usually by time)
      Object.keys(groups).forEach(k => {
          groups[k].sort((a, b) => (a.event_time || '').localeCompare(b.event_time || ''));
      });

      return groups;
  };

  const groupedPreds = getGroupedPredictions();
  const groupKeys = Object.keys(groupedPreds).sort(); // Default alpha sort
  
  // Custom sort for Confidence buckets
  if (viewMode === 'confidence') {
      const order = ['🔥 Very High (>80%)', '✅ High (>70%)', '⚠️ Medium (>60%)', 'Low Confidence'];
      groupKeys.sort((a, b) => {
          const ia = order.indexOf(a);
          const ib = order.indexOf(b);
          return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      });
  }

  // --- TOP PICKS: High confidence matches starting in the next few hours ---
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const topPicks = useMemo(() => {
    if (!predictions || predictions.length === 0) return [];
    
    const now = currentTime;
    const isToday = selectedDate === now.toISOString().split('T')[0];
    
    // Filter for high confidence (>65%) matches starting within the next 6 hours
    return predictions
      .filter(p => {
        // Must be high confidence
        if (p.Probability < 0.65) return false;
        
        // Must not be finished
        if (p.status === 'Finished') return false;
        
        // If viewing today, filter by time
        if (isToday && p.event_time) {
          try {
            // Parse match time (assuming UTC from API, convert to local)
            const [hours, mins] = p.event_time.split(':').map(Number);
            const matchTime = new Date(now);
            matchTime.setHours(hours, mins, 0, 0);
            
            // Calculate hours until match (can be negative if already started)
            const hoursUntil = (matchTime.getTime() - now.getTime()) / (1000 * 60 * 60);
            
            // Show matches starting in next 6 hours or just started (up to 1 hour ago)
            return hoursUntil >= -1 && hoursUntil <= 6;
          } catch (e) {
            return true; // Include if time parsing fails
          }
        }
        
        // For future dates, include all high confidence
        return true;
      })
      .sort((a: Prediction, b: Prediction) => {
        // Sort by time first, then by probability
        if (a.event_time && b.event_time) {
          const timeCompare = a.event_time.localeCompare(b.event_time);
          if (timeCompare !== 0) return timeCompare;
        }
        return b.Probability - a.Probability;
      })
      .slice(0, 10); // Top 10 picks
  }, [predictions, currentTime, selectedDate]);

  // Helper to format time until match
  const getTimeUntil = (eventTime: string | undefined, eventDate: string | undefined): string => {
    if (!eventTime) return '';
    
    const now = currentTime;
    const todayStr = now.toISOString().split('T')[0];
    const isToday = eventDate === todayStr;
    const isFuture = eventDate && eventDate > todayStr;
    
    // For future dates, just return the scheduled time - no live calculation
    if (isFuture) {
      return eventTime;
    }
    
    // For today, attempt time comparison (imperfect due to venue timezone)
    if (isToday) {
      try {
        const [hours, mins] = eventTime.split(':').map(Number);
        const matchTime = new Date(now);
        matchTime.setHours(hours, mins, 0, 0);
        
        const diffMs = matchTime.getTime() - now.getTime();
        const diffMins = Math.round(diffMs / (1000 * 60));
        
        if (diffMins < -60) return 'Started';
        if (diffMins < 0) return 'Live now';
        if (diffMins < 60) return `${diffMins}m`;
        const diffHours = Math.floor(diffMins / 60);
        const remainingMins = diffMins % 60;
        return `${diffHours}h ${remainingMins}m`;
      } catch (e) {
        return eventTime;
      }
    }
    
    // Past dates - just show time
    return eventTime;
  };

  return (
    <div className="min-h-screen bg-brand-dark font-sans text-slate-200 selection:bg-tennis selection:text-brand-dark">
      
      {/* --- NAVBAR --- */}
      <nav className="sticky top-0 z-50 glass-panel border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
                <h1 className="text-2xl font-bold tracking-tighter flex items-center gap-2">
                    <span className="text-tennis">🎾</span>
                    <span className="text-white">Eye</span>
                    <span className="text-tennis">Tennis</span>
                    <span className="text-xs bg-white/10 px-2 py-0.5 rounded text-slate-300 ml-2 font-mono">V5.SOTA</span>
                </h1>
                <div className="hidden md:flex ml-10 space-x-1">
                    <Link to="/dashboard" className="text-white hover:bg-white/10 px-3 py-2 rounded-md text-sm font-medium transition-colors">Dashboard</Link>
                    {!isSubscribed && (
                      <Link to="/premium" className="text-slate-400 hover:text-tennis px-3 py-2 rounded-md text-sm font-medium flex items-center transition-colors">
                          <Crown className="w-4 h-4 mr-1.5 text-tennis" />
                          Premium
                      </Link>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/account" className="flex items-center gap-1.5 text-slate-400 hover:text-white px-2 py-1.5 rounded-md text-sm font-medium transition-colors" title="Account Settings">
                <User className="w-4 h-4" />
                <span className="hidden lg:inline">Account</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        

        {/* --- CONTROLS --- */}
        <div className="flex flex-col xl:flex-row items-end xl:items-center justify-between gap-4 glass-panel p-4 rounded-xl">
            <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto">
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                        <Calendar className="w-3 h-3 inline mr-1" /> Date
                    </label>
                    <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-brand-dark border border-white/10 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-tennis focus:border-transparent outline-none w-full"
                    />
                </div>
                
                {/* View Mode Switcher */}
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                        <LayoutGrid className="w-3 h-3 inline mr-1" /> Group By
                    </label>
                    <div className="flex bg-brand-dark border border-white/10 rounded-lg p-1">
                        <button 
                            onClick={() => setViewMode('tournament')}
                            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${viewMode === 'tournament' ? 'bg-tennis text-brand-dark' : 'text-slate-400 hover:text-white'}`}
                        >
                            <Trophy className="w-4 h-4 inline mr-1" /> Tourney
                        </button>
                        <button 
                            onClick={() => setViewMode('confidence')}
                            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${viewMode === 'confidence' ? 'bg-tennis text-brand-dark' : 'text-slate-400 hover:text-white'}`}
                        >
                            <TrendingUp className="w-4 h-4 inline mr-1" /> Prob%
                        </button>
                        <button 
                            onClick={() => setViewMode('time')}
                            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${viewMode === 'time' ? 'bg-tennis text-brand-dark' : 'text-slate-400 hover:text-white'}`}
                        >
                            <Clock className="w-4 h-4 inline mr-1" /> Time
                        </button>
                    </div>
                </div>

                {/* Bookmaker Selector */}
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                        <DollarSign className="w-3 h-3 inline mr-1" /> Bookmaker
                    </label>
                    <select
                        value={selectedBookmaker}
                        onChange={(e) => setSelectedBookmaker(e.target.value)}
                        className="bg-brand-dark border border-white/10 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-tennis focus:border-transparent outline-none text-sm"
                    >
                        <option value="all">All Bookmakers</option>
                        {availableBookmakers.map(bookie => (
                            <option key={bookie} value={bookie}>{bookie}</option>
                        ))}
                    </select>
                </div>

                {/* Filter Toggle & Expansion */}
                <div className="flex gap-2">
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                            <Filter className="w-3 h-3 inline mr-1" /> Filters
                        </label>
                        <button
                            onClick={() => setHighConfidenceOnly(!highConfidenceOnly)}
                            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${highConfidenceOnly ? 'bg-accent-green/20 border-accent-green text-accent-green' : 'bg-brand-dark border-white/10 text-slate-400 hover:border-white/30'}`}
                        >
                            {highConfidenceOnly ? '✅ High Conf.' : 'Show All'}
                        </button>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                            View
                        </label>
                        <div className="flex gap-1">
                            <button onClick={() => toggleAll(true)} className="px-3 py-2 rounded-lg border border-white/10 bg-brand-dark text-slate-400 hover:text-white text-xs">
                                <ChevronDown className="w-4 h-4" />
                            </button>
                            <button onClick={() => toggleAll(false)} className="px-3 py-2 rounded-lg border border-white/10 bg-brand-dark text-slate-400 hover:text-white text-xs">
                                <ChevronUp className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <Button onClick={handlePredictMatches} disabled={loading} variant="tennis" className="w-full xl:w-auto font-bold">
                {loading && <span className="inline-block w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />}
                {loading ? 'Analysing...' : 'Refresh Data'}
            </Button>
        </div>

        {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center text-red-400">
            <AlertCircle className="w-5 h-5 mr-3" />
            {error}
            </div>
        )}

        {/* --- TOP PICKS SECTION --- */}
        {topPicks.length > 0 && (
          <div className="glass-panel rounded-xl overflow-hidden border-2 border-tennis/30 shadow-neon">
            <div className="p-4 bg-gradient-to-r from-tennis/20 to-transparent border-b border-tennis/20">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-tennis" />
                  Top Picks
                  <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-slate-300 ml-2 font-mono">
                    Next {selectedDate === currentTime.toISOString().split('T')[0] ? '6 hours' : 'day'}
                  </span>
                </h2>
                <div className="text-xs text-slate-400 font-mono flex items-center gap-1">
                  <Timer className="w-3 h-3" />
                  {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <p className="text-sm text-slate-400 mt-1">High confidence matches starting soon</p>
            </div>
            
            <div className="p-4 overflow-x-auto">
              <div className="flex gap-3 pb-2">
                {topPicks.map((pick: Prediction, idx: number) => {
                  const [p1, p2] = pick.Match.split(' vs ');
                  const timeUntil = getTimeUntil(pick.event_time, pick.event_date);
                  // Use REAL live status from API - no timezone guessing!
                  const isLive = pick.event_live === true;
                  // Format live score if available
                  const liveScoreText = isLive && pick.live_score?.sets?.length 
                    ? pick.live_score.sets.map(s => `${s.p1}-${s.p2}`).join(' ')
                    : null;
                  
                  return (
                    <div 
                      key={pick.event_key} 
                      className={`relative p-3 rounded-lg border transition-all hover:scale-[1.02] min-w-[180px] w-[180px] flex-shrink-0 ${
                        isLive 
                          ? 'bg-red-500/10 border-red-500/30 animate-pulse' 
                          : 'bg-brand-card/50 border-white/10 hover:border-tennis/50'
                      }`}
                    >
                      {/* Rank Badge */}
                      <div className="absolute -top-2 -left-2 w-6 h-6 bg-tennis text-brand-dark rounded-full flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </div>
                      
                      {/* Time Badge */}
                      <div className={`absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isLive 
                          ? 'bg-red-500 text-white animate-pulse' 
                          : 'bg-brand-dark border border-white/20 text-slate-300'
                      }`}>
                        {isLive ? '🔴 LIVE' : timeUntil || pick.event_time}
                      </div>
                      
                      {/* Content */}
                      <div className="mt-2 space-y-2">
                        <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded border inline-block ${getSurfaceColor(pick.Surface)}`}>
                          {pick.Surface}
                        </div>
                        
                        <div className="space-y-1">
                          <div className={`text-xs truncate ${pick['Winner Is P1'] ? 'text-white font-bold' : 'text-slate-500'}`}>
                            {pick['Winner Is P1'] && <Trophy className="w-3 h-3 inline mr-1 text-tennis" />}
                            {p1}
                          </div>
                          <div className={`text-xs truncate ${!pick['Winner Is P1'] ? 'text-white font-bold' : 'text-slate-500'}`}>
                            {!pick['Winner Is P1'] && <Trophy className="w-3 h-3 inline mr-1 text-tennis" />}
                            {p2}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between pt-1 border-t border-white/5">
                          <span className={`font-mono font-bold text-sm ${getConfidenceColor(pick.Probability)}`}>
                            {(pick.Probability * 100).toFixed(0)}%
                          </span>
                          <span className="text-[10px] text-slate-500 truncate max-w-[60px]">
                            {pick.Tournament.split(' ').slice(0, 2).join(' ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* --- MATCH CARDS GRID --- */}
        <div>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-accent-blue" />
                Predictions
                <span className="text-xs bg-brand-surface px-2 py-1 rounded-full text-slate-400 font-normal">
                    {predictions?.length || 0} Total
                </span>
            </h2>

            {predictions && predictions.length > 0 ? (
                <div className="space-y-4">
                    {groupKeys.map((groupKey) => {
                        // Tournament view: collapsed by default. Confidence/Time views: expanded by default.
                        const defaultExpanded = viewMode !== 'tournament';
                        const isExpanded = expandedGroups[groupKey] ?? defaultExpanded;
                        
                        return (
                        <div key={groupKey} className="border border-white/5 rounded-xl overflow-hidden bg-brand-card/30">
                            <button 
                                onClick={() => toggleGroup(groupKey)}
                                className="w-full flex items-center justify-between p-4 bg-brand-card/50 hover:bg-brand-card transition-colors text-left"
                            >
                                <div className="flex items-center gap-3">
                                    {isExpanded ? <ChevronDown className="w-5 h-5 text-tennis" /> : <ChevronRight className="w-5 h-5 text-slate-500" />}
                                    <h3 className="text-white font-bold uppercase tracking-wider text-sm flex items-center">
                                        {viewMode === 'tournament' && <Trophy className="w-4 h-4 mr-2 text-slate-400" />}
                                        {viewMode === 'confidence' && <TrendingUp className="w-4 h-4 mr-2 text-slate-400" />}
                                        {viewMode === 'time' && <Clock className="w-4 h-4 mr-2 text-slate-400" />}
                                        {groupKey}
                                    </h3>
                                    <span className="text-xs bg-brand-dark px-2 py-0.5 rounded-full text-slate-400 border border-white/10">
                                        {groupedPreds[groupKey].length}
                                    </span>
                                </div>
                                <div className="text-xs text-slate-500 font-mono hidden sm:block">
                                    {isExpanded ? 'Click to collapse' : 'Click to expand'}
                                </div>
                            </button>
                            
                            {isExpanded && (
                                <div className="p-4 border-t border-white/5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {groupedPreds[groupKey].map((pred, idx) => {
                                            const [p1, p2] = pred.Match.split(' vs ');
                                            return (
                                                <div key={idx} className="glass-panel p-4 rounded-lg hover:border-tennis/50 transition-all group relative overflow-hidden">
                                                    {/* Simplified Card Content */}
                                                    <div className="flex justify-between items-center mb-3">
                                                        <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getSurfaceColor(pred.Surface)}`}>
                                                            {pred.Surface}
                                                        </div>
                                                        <div className="text-[10px] font-mono text-slate-400">
                                                            {pred.event_time || '--:--'}
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        {/* Player 1 */}
                                                        <div className="flex justify-between items-center">
                                                            <span className={`font-bold text-sm ${pred['Winner Is P1'] ? 'text-white' : 'text-slate-500'}`}>
                                                                {p1}
                                                            </span>
                                                            {pred['Winner Is P1'] && <Trophy className="w-3 h-3 text-tennis" />}
                                                        </div>
                                                        
                                                        {/* Probability Bar */}
                                                        <div className="h-1 bg-brand-dark rounded-full overflow-hidden flex">
                                                            <div 
                                                                className={`h-full transition-all duration-1000 ${pred['Winner Is P1'] ? 'bg-tennis' : 'bg-slate-700'}`} 
                                                                style={{ width: `${pred['Winner Is P1'] ? pred.Probability * 100 : (1-pred.Probability)*100}%` }}
                                                            />
                                                        </div>

                                                        {/* Player 2 */}
                                                        <div className="flex justify-between items-center">
                                                            <span className={`font-bold text-sm ${!pred['Winner Is P1'] ? 'text-white' : 'text-slate-500'}`}>
                                                                {p2}
                                                            </span>
                                                            {!pred['Winner Is P1'] && <Trophy className="w-3 h-3 text-tennis" />}
                                                        </div>
                                                    </div>

                                                    <div className="mt-3 pt-3 border-t border-white/5 flex justify-between items-center">
                                                        <div className={`font-mono font-bold text-sm ${getConfidenceColor(pred.Probability)}`}>
                                                            {(pred.Probability * 100).toFixed(1)}%
                                                        </div>
                                                        {/* Retirement Warning Badge */}
                                                        {pred.retirement_warning && (
                                                            <div className="flex items-center gap-1 text-[10px] bg-accent-orange/20 text-accent-orange px-1.5 py-0.5 rounded border border-accent-orange/30" title="Recent retirement detected - probability adjusted">
                                                                <AlertCircle className="w-3 h-3" />
                                                                {pred.p1_days_since_retirement !== null && pred.p1_days_since_retirement !== undefined && pred.p1_days_since_retirement <= 7 && (
                                                                    <span>P1:{pred.p1_days_since_retirement}d</span>
                                                                )}
                                                                {pred.p2_days_since_retirement !== null && pred.p2_days_since_retirement !== undefined && pred.p2_days_since_retirement <= 7 && (
                                                                    <span>P2:{pred.p2_days_since_retirement}d</span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                        );
                    })}
                </div>
            ) : (
                !loading && <div className="text-center py-12 text-slate-500 bg-brand-card/30 rounded-xl border border-dashed border-white/10">No matches found for selected filters.</div>
            )}
        </div>

        {/* --- VALUE BETTING TERMINAL --- */}
        {predictions && predictions.length > 0 && (
            <div className="glass-panel rounded-xl overflow-hidden border border-tennis/20 shadow-neon mt-12">
                <div className="p-6 border-b border-white/10 bg-brand-card/80 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-tennis" />
                            Value Betting Terminal
                        </h3>
                        <p className="text-sm text-slate-400 mt-1">Real-time odds analysis & Kelly Criterion sizing</p>
                    </div>
                    
                    {/* Controls */}
                    <div className="flex flex-wrap items-center gap-4">
                        {/* Bankroll Input */}
                        <div className="flex items-center gap-3 bg-brand-dark/50 p-2 rounded-lg border border-white/10">
                            <span className="text-xs font-bold text-tennis whitespace-nowrap">
                                <DollarSign className="w-3 h-3 inline mr-1" /> Bankroll
                            </span>
                            <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                                <input
                                    type="number"
                                    value={bankroll}
                                    onChange={(e) => setBankroll(parseFloat(e.target.value) || 0)}
                                    className="w-24 bg-slate-700 text-white text-sm rounded px-2 py-1 pl-5 focus:ring-1 focus:ring-tennis outline-none"
                                />
                            </div>
                        </div>

                        {/* Slider */}
                        <div className="flex items-center gap-3 bg-brand-dark/50 p-2 rounded-lg border border-white/10">
                            <span className="text-xs font-bold text-tennis whitespace-nowrap">EV &gt; {evThreshold}%</span>
                            <input
                                type="range" min="-10" max="30" step="0.5"
                                value={evThreshold}
                                onChange={(e) => setEvThreshold(parseFloat(e.target.value))}
                                className="w-24 md:w-32 accent-tennis h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                    </div>
                </div>

                <div className="relative min-h-[200px]">
                    {!isSubscribed && !subLoading && (
                        <div className="absolute inset-0 z-20 bg-brand-dark/80 backdrop-blur-md flex flex-col items-center justify-center text-center p-8">
                            <Lock className="w-16 h-16 text-tennis mb-4 opacity-50" />
                            <h3 className="text-2xl font-bold text-white mb-2">Premium Feature</h3>
                            <p className="text-slate-300 mb-6 max-w-md">Access high-EV bets, stake sizing, and bookmaker comparisons.</p>
                            <Link to="/subscription">
                                <Button className="bg-tennis text-brand-dark hover:bg-tennis-dim font-bold px-8 py-3 rounded-full text-lg">
                                    Unlock Pro Access
                                </Button>
                            </Link>
                        </div>
                    )}

                    <div className={`overflow-x-auto ${!isSubscribed ? 'filter blur-sm opacity-30' : ''}`}>
                        <table className="w-full text-left">
                            <thead className="bg-brand-dark/50 text-xs uppercase text-slate-400 font-medium">
                                <tr>
                                    <th className="px-6 py-4">Match / Player</th>
                                    <th className="px-6 py-4 text-right cursor-pointer hover:text-tennis" onClick={() => handleSort('Odds')}>Odds</th>
                                    <th className="px-6 py-4 text-right cursor-pointer hover:text-tennis" onClick={() => handleSort('Model Prob')}>Prob</th>
                                    <th className="px-6 py-4 text-right cursor-pointer hover:text-tennis" onClick={() => handleSort('EV')}>EV</th>
                                    <th className="px-6 py-4 text-right cursor-pointer hover:text-tennis" onClick={() => handleSort('StakeAmount')}>Kelly Stake</th>
                                    <th className="px-6 py-4 text-right cursor-pointer hover:text-tennis" onClick={() => handleSort('ExpectedProfit')}>Exp. Profit</th>
                                    <th className="px-6 py-4 text-right">Bookie</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredBets.length > 0 ? filteredBets.map((bet, idx) => (
                                    <tr key={idx} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-white">{bet.Match}</div>
                                            <div className="text-xs text-tennis mt-1 flex items-center gap-1">
                                                <Activity className="w-3 h-3" /> Bet: {bet['Bet On']}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-slate-300">{bet.Odds.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-right font-mono text-slate-300">{bet['Model Prob'].toFixed(1)}%</td>
                                        <td className={`px-6 py-4 text-right font-mono font-bold ${bet.EV >= 0 ? 'text-accent-green' : 'text-red-400'}`}>
                                            {bet.EV > 0 ? '+' : ''}{bet.EV.toFixed(1)}%
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-white group-hover:text-tennis transition-colors">
                                            ${(bankroll * (bet.StakePct / 100)).toFixed(2)} <span className="text-slate-500 text-xs">({bet.StakePct.toFixed(1)}%)</span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono font-bold text-accent-green">
                                            +${((bankroll * (bet.StakePct / 100)) * (bet.EV / 100)).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-right text-xs text-slate-400 uppercase">{bet.Bookmaker}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                            No value bets found matching criteria.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}