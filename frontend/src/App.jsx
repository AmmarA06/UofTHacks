import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Layout } from './components/layout/Layout';
import { LandingPage } from './pages/LandingPage';
import { Dashboard } from './pages/Dashboard';
import { ObjectBrowser } from './pages/ObjectBrowser';
import { SpatialView } from './pages/SpatialView';
import { ClassManager } from './pages/ClassManager';
import { EventTimeline } from './pages/EventTimeline';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Landing Page */}
        <Route path="/" element={<LandingPage />} />

        {/* Protected App Routes - Wrapped in Layout */}
        <Route path="/*" element={
          <Layout>
            <Routes>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/objects" element={<ObjectBrowser />} />
              <Route path="/classes" element={<ClassManager />} />
              <Route path="/spatial" element={<SpatialView />} />
              <Route path="/events" element={<EventTimeline />} />
            </Routes>
          </Layout>
        } />
      </Routes>
    </Router>
  );
}

export default App;
