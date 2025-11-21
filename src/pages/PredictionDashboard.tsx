import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { AlertCircle, TrendingUp, Calendar, RefreshCw, Lock, Crown, DollarSign, Activity, Trophy } from 'lucide-react';
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
  event_time?: string;
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

export function PredictionDashboard() {
  const { user, signOut } = useAuth();
  const { isSubscribed, loading: subLoading } = useSubscription();
  const [selectedDate, setSelectedDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [predictions, setPredictions] = useState<Prediction[] | null>(null);
  const [valueBets, setValueBets] = useState<ValueBet[] | null>(null);
  const [evThreshold, setEvThreshold] = useState(0);
  const [sortConfig, setSortConfig] = useState<{ key: keyof ValueBet; direction: 'asc' | 'desc' } | null>({ key: 'EV', direction: 'desc' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        .eq('model_version', 'v4_sota_singles');

      if (predError) throw predError;

      const matchMap = new Map(matches.map(m => [m.event_key, m]));
      const now = new Date();
      
      const formattedPredictions: Prediction[] = preds.map(p => {
        const m = matchMap.get(p.event_key);
        if (!m) return null;

        if (m.event_time) {
            try {
                const matchDateTime = new Date(`${m.event_date}T${m.event_time}:00`);
                if (!isNaN(matchDateTime.getTime())) {
                    if (matchDateTime < now) { return null; }
                }
            } catch (e) {}
        }

        const winnerIsP1 = p.predicted_winner === m.first_player_name;
        const prob = winnerIsP1 ? p.prob_p1 : p.prob_p2;

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
          event_time: m.event_time
        };
      }).filter((p): p is Prediction => p !== null);

      formattedPredictions.sort((a, b) => {
          if (a.event_time && b.event_time) { return a.event_time.localeCompare(b.event_time); }
          return 0;
      });

      setPredictions(formattedPredictions);
      
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

  let filteredBets = valueBets?.filter(bet => bet.EV >= evThreshold) || [];
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
                    <span className="text-xs bg-white/10 px-2 py-0.5 rounded text-slate-300 ml-2 font-mono">V4.SOTA</span>
                </h1>
                <div className="hidden md:flex ml-10 space-x-1">
                    <Link to="/dashboard" className="text-white hover:bg-white/10 px-3 py-2 rounded-md text-sm font-medium transition-colors">Dashboard</Link>
                    <Link to="/subscription" className="text-slate-400 hover:text-tennis px-3 py-2 rounded-md text-sm font-medium flex items-center transition-colors">
                        <Crown className="w-4 h-4 mr-1.5 text-tennis" />
                        Premium
                    </Link>
                </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-400 hidden sm:inline font-mono">{user?.email}</span>
              <Button variant="outline" onClick={signOut} size="sm" className="border-white/20 hover:bg-white/10 text-white">
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* --- CONTROLS --- */}
        <div className="flex flex-col md:flex-row items-end md:items-center justify-between gap-4 glass-panel p-4 rounded-xl">
            <div className="w-full md:w-auto">
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                    <Calendar className="w-3 h-3 inline mr-1" /> Match Date
                </label>
                <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-brand-dark border border-white/10 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-tennis focus:border-transparent outline-none w-full md:w-48"
                />
            </div>
            <Button onClick={handlePredictMatches} disabled={loading} className="bg-tennis text-brand-dark hover:bg-tennis-dim font-bold w-full md:w-auto">
                {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                {loading ? 'Analysing...' : 'Refresh Data'}
            </Button>
        </div>

        {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center text-red-400">
            <AlertCircle className="w-5 h-5 mr-3" />
            {error}
            </div>
        )}

        {/* --- MATCH CARDS GRID --- */}
        <div>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-accent-blue" />
                Upcoming Matches
                <span className="text-xs bg-brand-surface px-2 py-1 rounded-full text-slate-400 font-normal">
                    {predictions?.length || 0} Found
                </span>
            </h2>

            {predictions && predictions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {predictions.map((pred, idx) => {
                        const [p1, p2] = pred.Match.split(' vs ');
                        return (
                            <div key={idx} className="glass-panel p-5 rounded-xl hover:border-tennis/50 transition-all group relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Trophy className="w-24 h-24 text-white" />
                                </div>
                                
                                <div className="flex justify-between items-start mb-4 relative z-10">
                                    <div className={`text-xs font-bold px-2 py-1 rounded border ${getSurfaceColor(pred.Surface)}`}>
                                        {pred.Surface}
                                    </div>
                                    <div className="text-xs font-mono text-slate-400 bg-brand-dark/50 px-2 py-1 rounded">
                                        {pred.event_time || '--:--'}
                                    </div>
                                </div>

                                <div className="space-y-3 relative z-10">
                                    {/* Player 1 */}
                                    <div className="flex justify-between items-center">
                                        <span className={`font-bold text-lg ${pred['Winner Is P1'] ? 'text-white' : 'text-slate-500'}`}>
                                            {p1}
                                        </span>
                                        {pred['Winner Is P1'] && <Trophy className="w-4 h-4 text-tennis" />}
                                    </div>
                                    
                                    {/* Probability Bar */}
                                    <div className="h-1.5 bg-brand-dark rounded-full overflow-hidden flex">
                                        <div 
                                            className={`h-full transition-all duration-1000 ${pred['Winner Is P1'] ? 'bg-tennis' : 'bg-slate-700'}`} 
                                            style={{ width: `${pred['Winner Is P1'] ? pred.Probability * 100 : (1-pred.Probability)*100}%` }}
                                        />
                                    </div>

                                    {/* Player 2 */}
                                    <div className="flex justify-between items-center">
                                        <span className={`font-bold text-lg ${!pred['Winner Is P1'] ? 'text-white' : 'text-slate-500'}`}>
                                            {p2}
                                        </span>
                                        {!pred['Winner Is P1'] && <Trophy className="w-4 h-4 text-tennis" />}
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center relative z-10">
                                    <div className="text-xs text-slate-500 uppercase tracking-wide">{pred.Tournament}</div>
                                    <div className={`font-mono font-bold text-lg ${getConfidenceColor(pred.Probability)}`}>
                                        {(pred.Probability * 100).toFixed(1)}%
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                !loading && <div className="text-center py-12 text-slate-500 bg-brand-card/30 rounded-xl border border-dashed border-white/10">No matches found.</div>
            )}
        </div>

        {/* --- VALUE BETTING TERMINAL --- */}
        {predictions && predictions.length > 0 && (
            <div className="glass-panel rounded-xl overflow-hidden border border-tennis/20 shadow-neon">
                <div className="p-6 border-b border-white/10 bg-brand-card/80 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-tennis" />
                            Value Betting Terminal
                        </h3>
                        <p className="text-sm text-slate-400 mt-1">Real-time odds analysis & Kelly Criterion sizing</p>
                    </div>
                    
                    {/* Slider */}
                    <div className="flex items-center gap-4 bg-brand-dark/50 p-2 rounded-lg border border-white/10">
                        <span className="text-xs font-bold text-tennis whitespace-nowrap">EV Threshold: {evThreshold}%</span>
                        <input
                            type="range" min="-10" max="30" step="0.5"
                            value={evThreshold}
                            onChange={(e) => setEvThreshold(parseFloat(e.target.value))}
                            className="w-32 md:w-48 accent-tennis h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                        />
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
                                            ${bet.StakeAmount.toFixed(2)} <span className="text-slate-500 text-xs">({bet.StakePct.toFixed(1)}%)</span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono font-bold text-accent-green">
                                            +${bet.ExpectedProfit.toFixed(2)}
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
