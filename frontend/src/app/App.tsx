import { BrowserRouter, Routes, Route } from 'react-router';
import { LandingPage } from './pages/LandingPage';
import { UploadWizard } from './pages/UploadWizard';
import { Dashboard } from './pages/Dashboard';
import { InfiniteCanvas } from './pages/InfiniteCanvas';
import { StudentReport } from './pages/StudentReport';
import { RootCauseTrace } from './pages/RootCauseTrace';
import { Reports } from './pages/Reports';
import { AISuggestions } from './pages/AISuggestions';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/upload" element={<UploadWizard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/canvas" element={<InfiniteCanvas />} />
        <Route path="/student-report" element={<StudentReport />} />
        <Route path="/trace/:concept" element={<RootCauseTrace />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/suggestions" element={<AISuggestions />} />
      </Routes>
    </BrowserRouter>
  );
}