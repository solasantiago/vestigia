// Vestigia · configuración
// La clave "anon" es pública por diseño. Lo que protege los datos es el login
// y las políticas de la base: sin una cuenta habilitada no se ve nada.
export const SUPABASE_URL = 'https://gziyvwnzacupowophkrr.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6aXl2d256YWN1cG93b3Boa3JyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0NzM0MzMsImV4cCI6MjEwNjA0OTQzM30.XOVlVIbPGHHfXpS3UkOp0egREMAzoz_oHPlYh8dO9QQ';

// Zona horaria de la casa: define qué es "hoy" sin importar la del dispositivo.
export const TZ = 'America/Argentina/Buenos_Aires';

export const APP_NAME = 'Vestigia';
export const APP_VERSION = '0.1.6';

// El día de la casa empieza a las 05:00: lo que pasa entre las 0 y las 5 cuenta para el día anterior.
export const DAY_START_HOUR = 5;
// Buenos Aires no tiene horario de verano: UTC−3 fijo.
export const TZ_OFFSET = '-03:00';

// Qué partes están encendidas en esta versión (se van sumando por versión).
export const FEATURES = {
  mood: false, // v0.2: ánimo privado en el celular de cada uno
  wellbeing: false, // v0.3: sueño, pasos y pantalla
  analysis: false, // v0.3: correlaciones con semanas de historia
  personalAccounts: false, // v0.2: cuentas de Mica y Santi
};

// Prefijo de lo que se guarda en el navegador (separado de la demo, que comparte dominio).
export const STORE = 'vestigia';
