import { useState } from 'react';
import { useAuth } from '../lib/auth.jsx';
import { APP_VERSION } from '../config.js';
import { HouseTrail, Mark, PawSteps } from './prints.jsx';

function traducir(msg = '') {
  if (/invalid login credentials/i.test(msg)) return 'Mail o contraseña incorrectos.';
  if (/email not confirmed/i.test(msg)) return 'La cuenta todavía no está confirmada en Supabase.';
  if (/fetch|network/i.test(msg)) return 'No hay conexión. Revisá el wifi y probá de nuevo.';
  return msg || 'No se pudo entrar.';
}

export function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(traducir(err.message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <HouseTrail className="login-trail" height={420} width={1100} animate />
      <form className="login-card" onSubmit={submit}>
        <Mark size={56} />
        <h1>Vestigia</h1>
        <p className="login-sub">Los rastros de cada día en casa.</p>
        <label className="field">
          <span>Mail</span>
          <input type="email" autoComplete="username" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="field">
          <span>Contraseña</span>
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error ? (
          <p className="login-error" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className="btn primary block" disabled={busy || !email || !password}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
        <p className="login-foot">
          Versión {APP_VERSION} · la sesión queda abierta en este dispositivo
        </p>
      </form>
    </div>
  );
}

export function Loading({ text = 'Siguiendo el rastro…' }) {
  return (
    <div className="state">
      <PawSteps count={6} />
      <p>{text}</p>
    </div>
  );
}

export function Denied() {
  const { email, signOut } = useAuth();
  return (
    <div className="login">
      <div className="login-card">
        <Mark size={56} />
        <h1>Cuenta sin habilitar</h1>
        <p className="login-sub">
          Entraste como <strong>{email}</strong>, pero esta cuenta todavía no tiene acceso a los datos de la casa.
        </p>
        <button type="button" className="btn block" onClick={signOut}>
          Salir y entrar con otra cuenta
        </button>
      </div>
    </div>
  );
}
