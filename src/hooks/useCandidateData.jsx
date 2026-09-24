import { useState, useEffect } from 'react';

// Simulates connecting to the Business Layer (Profile & Job Controllers)
export function useCandidateData() {
  const [user, setUser] = useState({ name: 'Jamie Cruz', email: 'jamie.cruz@email.com', completion: 72, initials: 'JC' });
  const [metrics, setMetrics] = useState({ active: 12, requests: 4, matchScore: 86 });
  const [jobs, setJobs] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  
  useEffect(() => {
    setJobs([
      { id: 1, title: 'Senior Product Designer', company: 'Norrgate Studio', location: 'Remote', match: 91 },
      { id: 2, title: 'Product Design Lead', company: 'Fieldstone', location: 'Manila, PH', match: 84 },
      { id: 3, title: 'UX Researcher', company: 'Halden & Co', location: 'Remote', match: 67 },
    ]);
    setSavedJobs([
      { id: 101, title: 'Product Designer II', company: 'Quietwork Labs', location: 'Hybrid', match: 88 },
      { id: 102, title: 'UX Lead', company: 'Marlowe Health', location: 'Remote', match: 73 },
    ]);
  }, []);

  const logout = () => {
    console.log("Logging out...");
  };

  return { user, metrics, jobs, savedJobs, logout };
}