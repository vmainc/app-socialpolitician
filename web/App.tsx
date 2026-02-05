import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import PoliticiansDirectory from './pages/PoliticiansDirectory';
import PoliticianProfile from './pages/PoliticianProfile';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/senators" element={<PoliticiansDirectory />} />
      <Route path="/representatives" element={<PoliticiansDirectory />} />
      <Route path="/governors" element={<PoliticiansDirectory />} />
      <Route path="/presidents" element={<Navigate to="/" replace />} />
      <Route path="/presidents/*" element={<Navigate to="/" replace />} />
      <Route path="/chat/*" element={<Navigate to="/" replace />} />
      <Route path="/compare" element={<Navigate to="/" replace />} />
      <Route path="/quote/*" element={<Navigate to="/" replace />} />
      <Route path="/:slug" element={<PoliticianProfile />} />
    </Routes>
  );
}

export default App;
