import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './presentation/pages/Login';
import Signup from './presentation/pages/Signup';
import CandidateDashboard from './presentation/pages/CandidateDashboard';
import RecruiterDashboard from './presentation/pages/RecruiterDashboard';
import JobDetailsPage from './presentation/pages/JobDetailsPage';
import CompanyProfilePage from './presentation/pages/CompanyProfilePage';
import LegalPage from './presentation/pages/LegalPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route path="/candidate-dashboard" element={<CandidateDashboard />} />
        <Route path="/candidate-dashboard/jobs/:jobId" element={<JobDetailsPage />} />
        <Route path="/jobs/:jobId" element={<JobDetailsPage />} />
        <Route path="/recruiter-dashboard" element={<RecruiterDashboard />} />
        <Route path="/companies/:companyId" element={<CompanyProfilePage />} />
        <Route path="/terms" element={<LegalPage type="terms" />} />
        <Route path="/privacy" element={<LegalPage type="privacy" />} />
      </Routes>
    </BrowserRouter>
  );
}
