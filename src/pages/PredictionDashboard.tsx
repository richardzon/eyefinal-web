import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { AlertCircle, TrendingUp, Calendar, RefreshCw, Lock, Crown } from 'lucide-react';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePredictMatches = async () => {
    setLoading(true);
    setError(null);
    try {
      const startDate = `${selectedDate}T00:00:00`;
      const endDate = `${selectedDate}T23:59:59`;

      // 1. Get Matches
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

      // 2. Get Predictions (V4 SOTA)
      const { data: preds, error: predError } = await supabase
        .from('predictions')
        .select('*')
        .in('event_key', eventKeys)
        .eq('model_version', 'v4_sota_singles');

      if (predError) throw predError;

      // 3. Format Data & Filter Past Matches
      const matchMap = new Map(matches.map(m => [m.event_key, m]));
      const now = new Date();
      
      const formattedPredictions: Prediction[] = preds.map(p => {
        const m = matchMap.get(p.event_key);
        if (!m) return null;

        // Time Filtering Logic
        if (m.event_time) {
            // event_time is usually "HH:MM"
            // Construct full date object
            try {
                const matchDateTime = new Date(`${m.event_date}T${m.event_time}:00`);
                if (!isNaN(matchDateTime.getTime())) {
                    // If match time is valid and in the past, skip it
                    // We add a 2-hour buffer (match duration) so users can see "Live" games
                    // matchDateTime.setHours(matchDateTime.getHours() + 2); 
                    
                    // If we want strictly "Upcoming", skip if start time < now
                    if (matchDateTime < now) {
                        return null;
                    }
                }
            } catch (e) {
                // If parsing fails, show it anyway (safe fallback)
            }
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
          H2H: 'View details', 
          Fatigue: 'View details',
          Streak: 'View details',
          Age: 'View details',
          'Serve%': 'View details',
          event_date: m.event_date,
          event_time: m.event_time
        };
      }).filter((p): p is Prediction => p !== null);

      // Sort by Time if available
      formattedPredictions.sort((a, b) => {
          if (a.event_time && b.event_time) {
              return a.event_time.localeCompare(b.event_time);
          }
          return 0;
      });

      setPredictions(formattedPredictions);
      
      // 4. Fetch Value Bets
      // Only for the filtered visible matches
      const visibleEventKeys = formattedPredictions.map(p => p.event_key);
      if (visibleEventKeys.length > 0) {
          await fetchValueBets(visibleEventKeys);
      } else {
          setValueBets([]);
      }

    } catch (err) {
      console.error('Error fetching predictions:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchValueBets = async (eventKeys: string[]) => {
    const { data: bets, error: betError } = await supabase
        .from('value_bets')
        .select('*')
        .in('event_key', eventKeys);
        
    if (betError) {
        console.error("Error fetching value bets", betError);
        return;
    }
    
    if (bets) {
        const { data: matches } = await supabase.from('matches').select('event_key, first_player_name, second_player_name').in('event_key', eventKeys);
        const nameMap = new Map(matches?.map(m => [m.event_key, `${m.first_player_name} vs ${m.second_player_name}`]) || []);

        const formattedBets: ValueBet[] = bets.map(b => ({
            Match: nameMap.get(b.event_key) || 'Unknown',
            'Bet On': b.player_name,
            Odds: b.odds,
            'Model Prob': b.prob * 100,
            EV: b.ev * 100,
            Bookmaker: b.bookmaker || 'Best Available',
            StakeAmount: b.stake_amount || 0,
            StakePct: (b.kelly_fraction || 0) * 100, // Convert to %
            ExpectedProfit: b.expected_profit || 0
        }));
        setValueBets(formattedBets);
    }
  };

  // Auto-load on date change
  useEffect(() => {
      handlePredictMatches();
  }, [selectedDate]);

  const filteredBets = valueBets?.filter(bet => bet.EV >= evThreshold) || [];

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
                <h1 className="text-2xl font-bold text-slate-900 mr-8">
                🎾 EyeTennis Predictor V4 SOTA
                </h1>
                <div className="hidden md:flex space-x-4">
                    <Link to="/dashboard" className="text-slate-600 hover:text-slate-900 px-3 py-2 rounded-md text-sm font-medium">
                        Dashboard
                    </Link>
                    <Link to="/subscription" className="text-slate-600 hover:text-slate-900 px-3 py-2 rounded-md text-sm font-medium flex items-center">
                        <Crown className="w-4 h-4 mr-1 text-amber-500" />
                        Subscription
                    </Link>
                </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-slate-600 hidden sm:inline">{user?.email}</span>
              <Button variant="outline" onClick={signOut} size="sm">
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 gap-6">
          
          <main className="col-span-1">
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
                <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5" />
                <div className="text-red-800">{error}</div>
              </div>
            )}

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
              <div className="flex items-end gap-4 mb-6">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Select Date for Prediction
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <Button onClick={handlePredictMatches} disabled={loading}>
                  {loading ? 'Loading...' : '🔮 Refresh'}
                </Button>
              </div>

              {predictions && predictions.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Time</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Match</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Winner</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Prob</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Surface</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Tournament</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {predictions.map((pred, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm font-mono text-slate-500">{pred.event_time || '--:--'}</td>
                          <td className="px-4 py-3 text-sm text-slate-900">{pred.Match}</td>
                          <td className="px-4 py-3 text-sm font-medium text-slate-900">{pred['Predicted Winner']}</td>
                          <td className="px-4 py-3 text-sm text-emerald-600 font-semibold">
                            {(pred.Probability * 100).toFixed(1)}%
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">{pred.Surface}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{pred.Tournament}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {predictions && predictions.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  No upcoming matches found for this date.
                </div>
              )}
            </div>

            {predictions && predictions.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 relative overflow-hidden">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-emerald-600" />
                  💰 Value Betting Analysis (Auto-Updated Hourly)
                </h3>

                {!isSubscribed && !subLoading && (
                    <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                        <Lock className="w-12 h-12 text-slate-400 mb-4" />
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Unlock Value Bets</h3>
                        <p className="text-slate-600 mb-6 max-w-md">
                            Upgrade to Premium to see AI-calculated value bets, real-time odds, and expected value (EV) analysis.
                        </p>
                        <Link to="/subscription">
                            <Button size="lg" className="bg-amber-500 hover:bg-amber-600 text-white border-none">
                                <Crown className="w-4 h-4 mr-2" />
                                Upgrade to Premium
                            </Button>
                        </Link>
                    </div>
                )}

                {valueBets && (
                  <div className={!isSubscribed ? 'filter blur-sm select-none pointer-events-none' : ''}>
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Minimum Expected Value (EV) %: {evThreshold.toFixed(1)}%
                      </label>
                      <input
                        type="range"
                        min="-10"
                        max="50"
                        step="0.5"
                        value={evThreshold}
                        onChange={(e) => setEvThreshold(parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>-10%</span>
                        <span>50%</span>
                      </div>
                    </div>

                    {filteredBets.length > 0 ? (
                      <>
                        <div className="mb-4 text-sm text-emerald-700 bg-emerald-50 px-4 py-2 rounded">
                          Found {filteredBets.length} bets with EV ≥ {evThreshold.toFixed(1)}%
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Match</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Bet On</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Odds</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Model Prob</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">EV</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Stake ($)</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Exp. Profit</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Bookmaker</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {filteredBets.map((bet, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                  <td className="px-4 py-3 text-sm text-slate-900">{bet.Match}</td>
                                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{bet['Bet On']}</td>
                                  <td className="px-4 py-3 text-sm text-slate-600">{bet.Odds.toFixed(2)}</td>
                                  <td className="px-4 py-3 text-sm text-slate-600">{bet['Model Prob'].toFixed(1)}%</td>
                                  <td className="px-4 py-3 text-sm font-semibold text-emerald-600">
                                    {bet.EV.toFixed(1)}%
                                  </td>
                                  <td className="px-4 py-3 text-sm font-mono text-amber-600">
                                    ${bet.StakeAmount.toFixed(2)} ({bet.StakePct.toFixed(1)}%)
                                  </td>
                                  <td className="px-4 py-3 text-sm font-mono text-emerald-600">
                                    +${bet.ExpectedProfit.toFixed(2)}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-slate-600">{bet.Bookmaker}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8 text-slate-500">
                        No bets found with EV ≥ {evThreshold.toFixed(1)}%
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">System Status</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl mb-2">✅</div>
                  <div className="text-sm font-medium text-slate-900">Automation</div>
                  <div className="text-xs text-slate-500">Active (Daily)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-2">✅</div>
                  <div className="text-sm font-medium text-slate-900">Odds Sync</div>
                  <div className="text-xs text-slate-500">Active (Hourly)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-2">✅</div>
                  <div className="text-sm font-medium text-slate-900">Database</div>
                  <div className="text-xs text-slate-500">Connected</div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
