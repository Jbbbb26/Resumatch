import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logoutUser,updateUserMetadata, getCurrentUser,createPublicProfile } from '../../data/services/authService';
export default function RecruiterDashboard() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const verifyRole = async () => {
      const response = await getCurrentUser();
      
      if (response.success && response.data) {
        const userRole = response.data.user_metadata?.role;
        
        if (userRole !== 'recruiter') {
          navigate('/candidate-dashboard');
          return;
        }
        
        setIsLoading(false);
      } else {
        navigate('/login');
      }
    };
    verifyRole();
  }, [navigate]);

  const handleLogout = async () => {
    const response = await logoutUser();
    if (response.success) {
      navigate('/login');
    } else {
      console.error(response.message);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#090e15] flex flex-col items-center justify-center space-y-4">
        <svg className="animate-spin h-10 w-10 text-[#ea6036]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-100" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-slate-400 text-sm font-medium animate-pulse">Loading workspace...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 space-y-6">
      <h1 className="text-3xl font-bold text-slate-800">Recruiter Portal</h1>
      <p className="text-slate-600">Welcome to your workspace.</p>
      
      <button 
        onClick={handleLogout}
        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-sm"
      >
        Sign Out
      </button>
    </div>
  );
}