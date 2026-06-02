// ============================================================
// PÁGINA: LOGIN - INICIO DE SESIÓN
// ============================================================

// 1 - IMPORTO REACT, HOOKS Y DEPENDENCIAS:
import { useState }        from 'react';
import { useNavigate }     from 'react-router-dom';
import { useAuth }         from '../context/AuthContext';
import { Mail, Lock, Zap } from 'lucide-react';

export default function Login() {

  // 2 - DEFINO EL ESTADO DEL FORMULARIO:
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [error,     setError]     = useState('');
  const [cargando,  setCargando]  = useState(false);

  // 3 - TRAIGO LAS FUNCIONES DE AUTH Y NAVEGACIÓN:
  const { login }   = useAuth();
  const navigate    = useNavigate();

  // 4 - USUARIOS DE PRUEBA PARA RELLENAR RÁPIDO:
  const hints = [
    { label: 'Admin',   email: 'admin@pagos.com',   password: 'admin123' },
    { label: 'Cliente', email: 'cliente@pagos.com', password: 'cliente123' },
  ];

  // 5 - MANEJO EL SUBMIT DEL FORMULARIO:
  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Por favor completá todos los campos.');
      return;
    }

    try {
      setCargando(true);

      // 6 - LLAMO AL ENDPOINT DE LOGIN:
      const res = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      });

      const data = await res.json();

      // 7 - SI HAY ERROR, LO MUESTRO:
      if (!res.ok) {
        setError(data.error || 'Error al iniciar sesión');
        return;
      }

      // 8 - GUARDO EL TOKEN Y NAVEGO SEGÚN ROL:
      login(data.token, data.user, data.client);

      if (data.user.role === 'client') {
        navigate('/mi-cuenta');
      } else {
        // 8a - EL ADMIN VA DIRECTO A FACTURAS:
        navigate('/factura');
      }

    } catch (err) {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setCargando(false);
    }
  }

  // 9 - RELLENO EL FORM CON UN USUARIO DE PRUEBA:
  function usarHint(hint) {
    setEmail(hint.email);
    setPassword(hint.password);
    setError('');
  }

  // 10 - RENDERIZO LA PÁGINA DE LOGIN:
  return (
    <div className="login-page">
      <div className="login-card">

        {/* LOGO / MARCA */}
        <div className="login-logo">
          <div className="login-logo-icon">
            <Zap size={32} color="var(--color-primary)" />
          </div>
          <h1>PáginadePagos</h1>
          <p>Ingresá para continuar</p>
        </div>

        {/* FORMULARIO */}
        <form className="login-form" onSubmit={handleSubmit}>

          {/* CAMPO EMAIL */}
          <div className="form-group">
            <label>Email</label>
            <div className="input-with-icon">
              <Mail size={16} className="input-icon" />
              <input
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                disabled={cargando}
              />
            </div>
          </div>

          {/* CAMPO CONTRASEÑA */}
          <div className="form-group">
            <label>Contraseña</label>
            <div className="input-with-icon">
              <Lock size={16} className="input-icon" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={cargando}
              />
            </div>
          </div>

          {/* MENSAJE DE ERROR */}
          {error && <div className="login-error">{error}</div>}

          {/* BOTÓN SUBMIT */}
          <button
            type="submit"
            className="btn btn-primary w-full login-btn"
            disabled={cargando}
          >
            {cargando ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        {/* USUARIOS DE ACCESO RÁPIDO */}
        <div className="login-hints">
          <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: 10 }}>
            Acceso rápido de prueba:
          </p>
          {hints.map(h => (
            <div key={h.label} className="login-hint-row" onClick={() => usarHint(h)}>
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{h.label}</span>
              <code>{h.email}</code>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

