import { supabase } from '../../../supabaseClient.js';

export function subscribeToTable(channelName, { event = '*', table, filter }, onChange, onStatus) {
  const channel = supabase
    .channel(channelName)
    .on('postgres_changes', { event, schema: 'public', table, ...(filter ? { filter } : {}) }, onChange)
    .subscribe(onStatus);
  return () => { supabase.removeChannel(channel); };
}
