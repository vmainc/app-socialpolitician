import { Routes, Route, Navigate } from 'react-router-dom';
import Navigation from './components/Navigation';
import Home from './pages/Home';
import PoliticiansDirectory from './pages/PoliticiansDirectory';
import PoliticianProfile from './pages/PoliticianProfile';
import Account from './pages/Account';

function App() {
  return (
    <>
      <Navigation />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/senators" element={<PoliticiansDirectory />} />
        <Route path="/representatives" element={<PoliticiansDirectory />} />
        <Route path="/governors" element={<PoliticiansDirectory />} />
        <Route path="/account" element={<Account />} />
        {/* Redirect old presidency routes to home */}
        <Route path="/presidents" element={<Navigate to="/" replace />} />
        <Route path="/presidents/*" element={<Navigate to="/" replace />} />
        <Route path="/chat/*" element={<Navigate to="/" replace />} />
        <Route path="/compare" element={<Navigate to="/" replace />} />
        <Route path="/quote/*" element={<Navigate to="/" replace />} />
        {/* Politician profile - slug only (must be last) */}
        <Route path="/:slug" element={<PoliticianProfile />} />
      </Routes>
    </>
  );
}

export default App;
