import { createContext, useContext, useState, useEffect } from 'react';
import pb from '../lib/pb';
import { t } from '../lib/i18n';
import { ApiError, fetchCurrentUser, loginWithCustomAuth } from '../lib/apiClient';
import { clearAuthSession, readAuthSession, writeAuthSession } from '../lib/authStore';

const AuthContext = createContext(null);

function loadLegacySession() {
  const savedUser = localStorage.getItem('auth_user');
  const savedType = localStorage.getItem('auth_type');
  const savedToken = localStorage.getItem('auth_token');

  if (!savedUser || !savedType) return null;

  try {
    const user = JSON.parse(savedUser);
    if (!user || !savedType) return null;

    const session = {
      role: savedType,
      user,
      pb_token: savedType === 'admin' ? savedToken : undefined,
    };

    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_type');
    localStorage.removeItem('auth_token');
    writeAuthSession(session);
    return session;
  } catch (error) {
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_type');
    localStorage.removeItem('auth_token');
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null); // 'professor', 'student', 'admin'
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'en');

  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      const session = readAuthSession() || loadLegacySession();
      if (!session || !session.role || !session.user) {
        if (mounted) setLoading(false);
        return;
      }

      if (session.role === 'admin' && session.pb_token) {
        pb.authStore.save(session.pb_token, session.pb_record || session.user);
        if (mounted) {
          setUser(session.user);
          setUserType('admin');
          setLoading(false);
        }
        return;
      }

      if (!session.access_token || !session.refresh_token) {
        clearAuthSession();
        if (mounted) setLoading(false);
        return;
      }

      try {
        const refreshedUser = await fetchCurrentUser();
        if (!refreshedUser) {
          throw new Error('Failed to restore user');
        }

        const nextSession = {
          ...session,
          user: refreshedUser,
        };
        writeAuthSession(nextSession);

        if (mounted) {
          setUser(refreshedUser);
          setUserType(session.role);
        }
      } catch (error) {
        clearAuthSession();
      } finally {
        if (mounted) setLoading(false);
      }
    }

    restoreSession();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('lang', lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  const login = async (email, password, type) => {
    try {
      if (type === 'admin') {
        const authData = await pb.collection('_superusers').authWithPassword(email, password);
        const userData = {
          id: authData.record.id,
          email: authData.record.email || email,
          name_en: 'Administrator',
          name_ar: 'مدير النظام',
          role: 'admin'
        };

        writeAuthSession({
          role: 'admin',
          user: userData,
          pb_token: authData.token,
          pb_record: authData.record
        });

        setUser(userData);
        setUserType('admin');
        return { success: true, user: userData, role: 'admin' };
      }

      const session = await loginWithCustomAuth(type, email, password);
      const effectiveRole = session?.user?.role || type;
      setUser(session.user);
      setUserType(effectiveRole);
      return { success: true, user: session.user, role: effectiveRole };
    } catch (error) {
      console.error('Login error:', error);

      if (error instanceof ApiError) {
        if (error.status === 401 || error.status === 400 || error.code === 'INVALID_CREDENTIALS') {
          return { success: false, error: t('loginFailed', lang) };
        }
        return { success: false, error: error.message || t('networkError', lang) };
      }

      return { success: false, error: t('networkError', lang) };
    }
  };

  const logout = () => {
    pb.authStore.clear();
    clearAuthSession();
    setUser(null);
    setUserType(null);
  };

  const toggleLang = () => {
    setLang(prev => prev === 'en' ? 'ar' : 'en');
  };

  const i = (key) => t(key, lang);

  return (
    <AuthContext.Provider value={{ user, userType, loading, lang, login, logout, toggleLang, i }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
