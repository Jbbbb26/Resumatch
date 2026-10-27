import { supabase } from '../../../supabaseClient.js';

export const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

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
