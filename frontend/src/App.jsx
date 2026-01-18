import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Layout } from './components/layout/Layout';
import { LandingPage } from './pages/LandingPage';
import { Dashboard } from './pages/Dashboard';
import { ObjectBrowser } from './pages/ObjectBrowser';
import { SpatialView } from './pages/SpatialView';
import { ClassManager } from './pages/ClassManager';
import { EventTimeline } from './pages/EventTimeline';
import Store from './pages/Store';

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/objects" element={<ObjectBrowser />} />
        <Route path="/spatial" element={<SpatialView />} />
        <Route path="/events" element={<EventTimeline />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/objects" element={<ObjectBrowser />} />
          <Route path="/classes" element={<ClassManager />} />
          <Route path="/spatial" element={<SpatialView />} />
          <Route path="/events" element={<EventTimeline />} />
          <Route path="/store" element={<Store />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
