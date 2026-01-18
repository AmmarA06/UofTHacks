import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { LandingPage } from './pages/LandingPage';
import { Dashboard } from './pages/Dashboard';
import { ObjectBrowser } from './pages/ObjectBrowser';
import { SpatialView } from './pages/SpatialView';
import { ClassManager } from './pages/ClassManager';
import { EventTimeline } from './pages/EventTimeline';
import Store from './pages/Store';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Landing Page - No Layout */}
        <Route path="/" element={<LandingPage />} />

        {/* App Routes - Wrapped in Layout */}
        <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
        <Route path="/objects" element={<Layout><ObjectBrowser /></Layout>} />
        <Route path="/classes" element={<Layout><ClassManager /></Layout>} />
        <Route path="/spatial" element={<Layout><SpatialView /></Layout>} />
        <Route path="/events" element={<Layout><EventTimeline /></Layout>} />
        <Route path="/store" element={<Layout><Store /></Layout>} />
      </Routes>
    </Router>
  );
}

export default App;
