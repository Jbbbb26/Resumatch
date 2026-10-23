import { supabase } from '../../../supabaseClient.js';

// Base URL of the Express API (server.js).
// - Local dev: leave VITE_API_URL empty; vite.config.js proxies /api to http://localhost:3000.
// - Deployed: set VITE_API_URL to the API service URL (e.g. https://resumatch-api.up.railway.app)
//   BEFORE building, or leave it empty if server.js serves the frontend from the same origin.
export const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

// Calls the API with the signed-in user's access token so the server can verify who is calling.
export async function apiFetch(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    return { success: false, message: 'Could not reach the server. Please try again.' };
  }

  try {
    return await response.json();
  } catch {
    return { success: false, message: `Server returned ${response.status}.` };
  }
}
