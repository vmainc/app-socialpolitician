import { Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import Presidents from './pages/Presidents';
import Chat from './pages/Chat';
import Compare from './pages/Compare';
import Quote from './pages/Quote';
import PresidentProfilePage from './pages/PresidentProfilePage';
// Social Politician routes
import Home from './pages/Home';
import PoliticiansDirectory from './pages/PoliticiansDirectory';
import PoliticianProfile from './pages/PoliticianProfile';
import Account from './pages/Account';

function App() {
  return (
    <>
      <Navigation />
      <Routes>
        {/* Social Politician routes */}
        <Route path="/" element={<Home />} />
        <Route path="/senators" element={<PoliticiansDirectory />} />
        <Route path="/representatives" element={<PoliticiansDirectory />} />
        <Route path="/governors" element={<PoliticiansDirectory />} />
        {/* Type-specific profile routes */}
        <Route path="/governors/:slug" element={<PoliticianProfile />} />
        <Route path="/senators/:slug" element={<PoliticianProfile />} />
        <Route path="/representatives/:slug" element={<PoliticianProfile />} />
        <Route path="/account" element={<Account />} />
        
        {/* Voices of the Presidency routes */}
        <Route path="/presidents" element={<Presidents />} />
        <Route path="/presidents/:slug" element={<PresidentProfilePage />} />
        <Route path="/chat/:presidentId" element={<Chat />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/quote/:shareId" element={<Quote />} />
      </Routes>
    </>
  );
}

export default App;
