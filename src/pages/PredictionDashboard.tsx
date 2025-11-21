import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { AlertCircle, TrendingUp, Calendar, RefreshCw, User } from 'lucide-react';
import { supabase } from '../lib/supabase';

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
}

interface ValueBet {
  Match: string;
  'Bet On': string;
  Odds: number;
  'Model Prob': number;
  EV: number;
  Bookmaker: string;
}

export function PredictionDashboard() {
  const { user, signOut } = useAuth();
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
      // Fetch matches for the selected date
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

      // 2. Get Predictions for these matches
      const { data: preds, error: predError } = await supabase
        .from('predictions')
        .select('*')
        .in('event_key', eventKeys)
        .eq('model_version', 'v3_ensemble_singles'); // Ensure matches Python script

      if (predError) throw predError;

      // 3. Merge Data
      const matchMap = new Map(matches.map(m => [m.event_key, m]));
      
      const formattedPredictions: Prediction[] = preds.map(p => {
        const m = matchMap.get(p.event_key);
        if (!m) return null;

        const winnerIsP1 = p.predicted_winner === m.first_player_name;
        // Supabase stores prob_p1 and prob_p2 directly now
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
          // Some fields might be missing if not stored in DB, using placeholders or calculated
          H2H: 'View details', 
          Fatigue: 'View details',
          Streak: 'View details',
          Age: 'View details',
          'Serve%': 'View details'
        };
      }).filter((p): p is Prediction => p !== null);

      setPredictions(formattedPredictions);
    } catch (err) {
      console.error('Error fetching predictions:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleFindValueBets = async () => {
    // Client-side value bet calculation if we don't have an odds API
    // For now, we'll just show a placeholder or integrate a client-side odds fetcher if available
    // Since the Python backend isn't available, we can't call /api/value-bets
    // But we can show the UI logic if the user manually inputs odds (like in app_hosted.py)
    // OR we can skip this feature for the static deployment
    alert("Automatic odds fetching requires the Python engine running locally. Please use the manual calculator below.");
  };

  const handleUpdateData = async () => {
    alert("To update data, please run 'python src/utils/sync_to_supabase.py' on your local machine.");
  };

  const handleFetchMetadata = async () => {
     alert("To update metadata, please run the Python scripts locally.");
  };

  const filteredBets = valueBets?.filter(bet => bet.EV >= evThreshold) || [];

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-slate-900">
              🎾 EyeTennis Predictor V3
            </h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-slate-600">{user?.email}</span>
              <Button variant="outline" onClick={signOut} size="sm">
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <aside className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Actions</h2>
              <div className="space-y-3">
                <Button
                  onClick={handleUpdateData}
                  disabled={loading}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Update Data & Retrain
                </Button>
                <Button
                  onClick={handleFetchMetadata}
                  disabled={loading}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <User className="w-4 h-4 mr-2" />
                  Fetch Player Metadata
                </Button>
              </div>
            </div>
          </aside>

          <main className="lg:col-span-3">
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
                  {loading ? 'Loading...' : '🔮 Predict Matches'}
                </Button>
              </div>

              {predictions && predictions.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Match</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Winner</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Prob</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Surface</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">H2H</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Fatigue</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Streak</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Age</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Serve%</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Tournament</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {predictions.map((pred, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm text-slate-900">{pred.Match}</td>
                          <td className="px-4 py-3 text-sm font-medium text-slate-900">{pred['Predicted Winner']}</td>
                          <td className="px-4 py-3 text-sm text-emerald-600 font-semibold">
                            {(pred.Probability * 100).toFixed(1)}%
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">{pred.Surface}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{pred.H2H}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{pred.Fatigue}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{pred.Streak}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{pred.Age}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{pred['Serve%']}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{pred.Tournament}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {predictions && predictions.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  No matches found for this date.
                </div>
              )}
            </div>

            {predictions && predictions.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-emerald-600" />
                  💰 Value Betting Analysis
                </h3>

                <Button onClick={handleFindValueBets} disabled={loading} className="mb-6">
                  Find Value Bets (Fetch Odds)
                </Button>

                {valueBets && (
                  <>
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
                  </>
                )}
              </div>
            )}

            <div className="mt-6 bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">System Status</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl mb-2">✅</div>
                  <div className="text-sm font-medium text-slate-900">Model</div>
                  <div className="text-xs text-slate-500">Loaded</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-2">✅</div>
                  <div className="text-sm font-medium text-slate-900">Processor</div>
                  <div className="text-xs text-slate-500">Ready</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-2">✅</div>
                  <div className="text-sm font-medium text-slate-900">Tournaments</div>
                  <div className="text-xs text-slate-500">Loaded</div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

