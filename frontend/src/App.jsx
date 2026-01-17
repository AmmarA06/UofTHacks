import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { ObjectBrowser } from './pages/ObjectBrowser';
import { SpatialView } from './pages/SpatialView';
import { ClassManager } from './pages/ClassManager';

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/objects" element={<ObjectBrowser />} />
        <Route path="/spatial" element={<SpatialView />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/objects" element={<ObjectBrowser />} />
          <Route path="/classes" element={<ClassManager />} />
          <Route path="/spatial" element={<SpatialView />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
