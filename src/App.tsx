import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { Dashboard } from './pages/Dashboard';
import { PredictionDashboard } from './pages/PredictionDashboard';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Subscription } from './pages/Subscription';
import { Premium } from './pages/Premium';
import { Success } from './pages/Success';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={user ? <PredictionDashboard /> : <Navigate to="/login" />}
        />
        <Route
          path="/predictions"
          element={user ? <PredictionDashboard /> : <Navigate to="/login" />}
        />
        <Route
          path="/dashboard"
          element={user ? <Dashboard /> : <Navigate to="/login" />}
        />
        <Route
          path="/login"
          element={!user ? <Login /> : <Navigate to="/" />}
        />
        <Route
          path="/signup"
          element={!user ? <Signup /> : <Navigate to="/" />}
        />
        <Route path="/subscription" element={<Subscription />} />
        <Route path="/premium" element={<Premium />} />
        <Route path="/success" element={<Success />} />
      </Routes>
    </Router>
  );
}

export default App;

