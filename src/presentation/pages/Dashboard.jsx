import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../supabaseClient.js';

export default function Dashboard() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 space-y-6">
      <h1 className="text-3xl font-bold text-slate-800">Welcome to your Dashboard!</h1>
      <p className="text-slate-600">You have successfully logged in.</p>
      
      <button 
        onClick={handleLogout}
        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
      >
        Sign Out
      </button>
    </div>
  );
}