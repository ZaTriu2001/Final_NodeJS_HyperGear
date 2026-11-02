import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { AuthContext } from './contexts';
export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    api('/auth/me').then(data => { if (active) setUser(data.user); }).catch(error => {
      if (active && error.status !== 401) setError(error.message);
    }).finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);
  const refresh = async () => { const data = await api('/auth/me'); setUser(data.user); return data.user; };
  const signIn = async (path, body) => { const data = await api('/auth/' + path, { method: 'POST', body }); setUser(data.user); setError(''); return data.user; };
  const logout = async () => { try { await api('/auth/logout', { method: 'POST' }); } catch (error) { if (![401, 403].includes(error.status)) throw error; } setUser(null); };
  return <AuthContext.Provider value={{ user, ready, error, signIn, refresh, logout, setUser }}>{children}</AuthContext.Provider>;
}
