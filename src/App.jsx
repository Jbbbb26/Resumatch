import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './presentation/pages/Login';
import Signup from './presentation/pages/Signup';
import CandidateDashboard from './presentation/pages/CandidateDashboard'; 
import RecruiterDashboard from './presentation/pages/RecruiterDashboard'; 
// You can remove the generic Dashboard import if you no longer need it

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
                 
        {/* Auth routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Role-specific Dashboards */}
        <Route path="/candidate-dashboard" element={<CandidateDashboard />} />
        <Route path="/recruiter-dashboard" element={<RecruiterDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}