import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import api, { setAuthToken } from '../services/api';

const TOKEN_KEY = 'petconnect_token';
const USER_KEY = 'petconnect_user';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
        const storedUser = await AsyncStorage.getItem(USER_KEY);

        if (storedToken && storedUser) {
          setToken(storedToken);
          setAuthToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const saveSession = async (authData) => {
    setToken(authData.token);
    setUser(authData.user);
    setAuthToken(authData.token);
    await AsyncStorage.multiSet([
      [TOKEN_KEY, authData.token],
      [USER_KEY, JSON.stringify(authData.user)]
    ]);
  };

  const login = async ({ email, password }) => {
    setAuthError('');
    const { data } = await api.post('/auth/login', { email, password });
    await saveSession(data);
  };

  const register = async ({ username, email, password }) => {
    setAuthError('');
    const { data } = await api.post('/auth/register', {
      username,
      email,
      password
    });
    await saveSession(data);
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    setAuthToken(null);
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
  };

  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      authError,
      setAuthError,
      isAuthenticated: Boolean(token && user),
      login,
      register,
      logout
    }),
    [user, token, isLoading, authError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
