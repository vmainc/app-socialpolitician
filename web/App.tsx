import { Routes, Route } from 'react-router-dom';
import Presidents from './pages/Presidents';
import Chat from './pages/Chat';
import Compare from './pages/Compare';
import Quote from './pages/Quote';
import PresidentProfilePage from './pages/PresidentProfilePage';
// Social Politician routes
import Home from './pages/Home';
import PoliticiansDirectory from './pages/PoliticiansDirectory';
import PoliticianProfile from './pages/PoliticianProfile';

function App() {
  return (
    <Routes>
      {/* Social Politician routes */}
      <Route path="/" element={<Home />} />
      <Route path="/senators" element={<PoliticiansDirectory />} />
      <Route path="/representatives" element={<PoliticiansDirectory />} />
      <Route path="/governors" element={<PoliticiansDirectory />} />
      
      {/* Voices of the Presidency routes - must come before /:slug */}
      <Route path="/presidents" element={<Presidents />} />
      <Route path="/presidents/:slug" element={<PresidentProfilePage />} />
      <Route path="/chat/:presidentId" element={<Chat />} />
      <Route path="/compare" element={<Compare />} />
      <Route path="/quote/:shareId" element={<Quote />} />
      
      {/* Politician profile route - slug only (must be last) */}
      <Route path="/:slug" element={<PoliticianProfile />} />
    </Routes>
  );
}

export default App;
