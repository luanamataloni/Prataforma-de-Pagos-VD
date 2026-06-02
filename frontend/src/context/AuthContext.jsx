// ============================================================
// CONTEXTO DE AUTENTICACIÓN - PROVEEDOR GLOBAL DE SESIÓN
// ============================================================

// 1 - IMPORTO REACT Y LOS HOOKS NECESARIOS:
import { createContext, useContext, useState, useEffect } from 'react';

// 2 - CREO EL CONTEXTO DE AUTH:
const AuthContext = createContext(null);

// 3 - HOOK PERSONALIZADO PARA USAR EL CONTEXTO:
export function useAuth() {
  return useContext(AuthContext);
}

// 4 - PROVEEDOR QUE ENVUELVE TODA LA APP:
export function AuthProvider({ children }) {

  // 5 - ESTADO DEL USUARIO LOGUEADO:
  const [user,    setUser]    = useState(null);
  const [client,  setClient]  = useState(null);
  const [loading, setLoading] = useState(true);

  // 6 - AL MONTAR, VERIFICO SI HAY TOKEN GUARDADO Y TRAIGO EL USUARIO:
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setLoading(false);
      return;
    }

    // 7 - VALIDO EL TOKEN CON EL BACKEND (GET /auth/me):
    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        setUser(data.user);
        setClient(data.client);
      })
      .catch(() => {
        // 8 - TOKEN INVÁLIDO O EXPIRADO → LIMPIO EL STORAGE:
        localStorage.removeItem('auth_token');
      })
      .finally(() => setLoading(false));
  }, []);

  // 9 - FUNCIÓN DE LOGIN: GUARDA TOKEN Y ACTUALIZA ESTADO:
  function login(token, userData, clientData) {
    localStorage.setItem('auth_token', token);
    setUser(userData);
    setClient(clientData);
  }

  // 10 - FUNCIÓN DE LOGOUT: LIMPIA TODO:
  function logout() {
    localStorage.removeItem('auth_token');
    setUser(null);
    setClient(null);
  }

  // 11 - EXPONGO EL CONTEXTO A TODA LA APP:
  const value = { user, client, loading, login, logout };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

