import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider, useAuth } from '../lib/auth.jsx';
import { Denied, Loading, Login } from '../components/Login.jsx';
import Tablero from './Tablero.jsx';
import '../styles.css';
import './chanchitos.css';

// Misma sesión y mismas cuentas que Vestigia; la app principal no enlaza esta página.
function Puerta() {
  const { status } = useAuth();
  if (status === 'loading') return <Loading text="Contando los chanchitos…" />;
  if (status === 'signed-out') return <Login />;
  if (status === 'denied') return <Denied />;
  return <Tablero />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <Puerta />
    </AuthProvider>
  </StrictMode>,
);
