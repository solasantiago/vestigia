import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../lib/auth.jsx';

// ───────── formato ─────────
const ARS = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ARS0 = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const PCT = new Intl.NumberFormat('es-AR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const n = (x) => Number(x) || 0;
const plata = (x) => ARS.format(n(x));
const plata0 = (x) => ARS0.format(n(x));
const aFecha = (s) => new Date(String(s).slice(0, 10) + 'T12:00:00');
const dia = (s) => {
  const d = aFecha(s);
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
};
const diaSemana = (s) => DIAS[aFecha(s).getDay()];
const diasEntre = (a, b) => Math.round((aFecha(b) - aFecha(a)) / 864e5);
const hora = (iso) => new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

const COLORES = {
  'Tarjetas de crédito': 'var(--cat-4)',
  Necesidades: 'var(--cat-2)',
  Gustos: 'var(--cat-1)',
  Finanzas: 'var(--cat-3)',
  'Sin clasificar': 'var(--status-warning)',
  Queda: 'var(--grid)',
};
const ORDEN = ['Tarjetas de crédito', 'Necesidades', 'Gustos', 'Finanzas', 'Sin clasificar', 'Queda'];

export default function Tablero() {
  const { email, signOut } = useAuth();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    const { data, error: err } = await supabase.rpc('chanchitos_tablero');
    if (err) setError(err.message || 'No se pudieron leer los datos.');
    else {
      setError(null);
      setDatos(data);
    }
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
    const alVolver = () => document.visibilityState === 'visible' && cargar();
    document.addEventListener('visibilitychange', alVolver);
    return () => document.removeEventListener('visibilitychange', alVolver);
  }, [cargar]);

  if (!datos && error) {
    return (
      <div className="state error">
        <div className="state-icon">🐷</div>
        <p>{error}</p>
        <button type="button" className="btn" onClick={cargar}>
          Reintentar
        </button>
      </div>
    );
  }
  if (!datos) {
    return (
      <div className="state">
        <div className="state-icon">🐷</div>
        <p>Contando los chanchitos…</p>
      </div>
    );
  }

  return (
    <div className="ch">
      <header className="ch-top">
        <div>
          <h1 className="ch-title">
            <span aria-hidden="true">🐷</span> ChanchitOS
          </h1>
          <p className="ch-sub">
            Ciclo del {dia(datos.flujo?.ini)} al {dia(datos.flujo?.fin)} · actualizado {hora(datos.generado)}
          </p>
        </div>
        <div className="ch-top-actions">
          <button type="button" className="btn xs" onClick={cargar} disabled={cargando}>
            {cargando ? 'Actualizando…' : '↻ Actualizar'}
          </button>
          <button type="button" className="btn xs ghost" onClick={signOut} title={email ?? ''}>
            Salir
          </button>
        </div>
      </header>
      {error ? <p className="ch-aviso">No se pudo actualizar: {error}. Se muestran los últimos datos.</p> : null}

      <Cifras datos={datos} />
      <Ciclo datos={datos} />
      <Destino capas={datos.capas ?? []} />
      <div className="ch-grid">
        <Pendientes pendientes={datos.pendientes ?? []} />
        <UltimoResumen filas={datos.ultimo_resumen ?? []} />
      </div>
      <Movimientos movimientos={datos.movimientos ?? []} />
      <p className="ch-pie">Los datos se cargan desde el chat con Claude en la base de Vestigia (esquema chanchitos).</p>
    </div>
  );
}

// ───────── cifras principales ─────────
function Cifras({ datos }) {
  const f = datos.flujo ?? {};
  const sueldo = n(f.sueldo) || 1;
  const quedan = Math.max(1, diasEntre(datos.hoy, f.fin) + 1);
  const tarjetas = (datos.capas ?? []).filter((c) => c.tarjeta && c.bloque !== 'Queda').reduce((s, c) => s + n(c.monto), 0);
  const pend = datos.pendientes ?? [];
  const conMonto = pend.filter((p) => p.monto_estimado != null);
  const comprometido = conMonto.reduce((s, p) => s + n(p.monto_estimado), 0);
  const libre = n(f.disponible) - comprometido;
  return (
    <section className="ch-cifras" aria-label="Cifras principales">
      <div className="card ch-cifra destacada">
        <p className="ch-label">Disponible en tus cuentas</p>
        <p className="ch-num">{plata(f.disponible)}</p>
        <p className="ch-det">
          ≈ <b>{plata0(libre / quedan)}</b> por día · {quedan} {quedan === 1 ? 'día' : 'días'} hasta el cobro
        </p>
        <p className="ch-det">
          {(datos.saldos ?? []).map((s) => `${s.medio} ${plata(s.saldo)}`).join(' · ')}
        </p>
      </div>
      <div className="card ch-cifra">
        <p className="ch-label">Salió del sueldo</p>
        <p className="ch-num">{PCT.format(n(f.egresos) / sueldo)}</p>
        <p className="ch-det">
          {plata(f.egresos)} de {plata(f.sueldo)}
        </p>
      </div>
      <div className="card ch-cifra">
        <p className="ch-label">Pagado de tarjetas de crédito</p>
        <p className="ch-num" style={{ color: 'var(--cat-4)' }}>
          {PCT.format(tarjetas / sueldo)}
        </p>
        <p className="ch-det">{plata(tarjetas)} del sueldo, por consumos del mes anterior</p>
      </div>
      <div className="card ch-cifra">
        <p className="ch-label">Pendientes del ciclo</p>
        <p className="ch-num">{pend.length}</p>
        <p className="ch-det">
          {conMonto.length ? `${plata(comprometido)} con monto · ` : ''}
          {pend.length - conMonto.length} sin monto todavía
        </p>
      </div>
    </section>
  );
}

// ───────── ciclo ─────────
function Ciclo({ datos }) {
  const f = datos.flujo ?? {};
  const total = Math.max(1, diasEntre(f.ini, f.fin));
  const pos = (s) => Math.min(100, Math.max(0, (diasEntre(f.ini, s) / total) * 100));
  const hoyPos = pos(datos.hoy);
  const eventos = datos.eventos ?? [];
  const ok = ['Pagado', 'Cubierto', 'Acreditado'];
  return (
    <section className="card ch-sec">
      <div className="card-head">
        <div>
          <h3>Ciclo de sueldo</h3>
          <p className="card-sub">Del cobro al último día que tiene que cubrir.</p>
        </div>
      </div>
      <div className="ch-linea" role="img" aria-label={`Día ${diasEntre(f.ini, datos.hoy) + 1} de ${total + 1}`}>
        <div className="ch-linea-pista" />
        <div className="ch-linea-avance" style={{ width: `${hoyPos}%` }} />
        {eventos.map((e) => (
          <span key={e.id} className={'ch-linea-punto' + (e.fecha <= datos.hoy ? ' pasado' : '')} style={{ left: `${pos(e.fecha)}%` }} />
        ))}
        <span className="ch-linea-hoy" style={{ left: `${hoyPos}%` }}>
          <span>Hoy</span>
        </span>
      </div>
      <div className="ch-linea-ext">
        <span>{dia(f.ini)} · cobro</span>
        <span>{dia(f.fin)} · último día</span>
      </div>
      <ol className="ch-eventos">
        {eventos.map((e) => (
          <li key={e.id} className={e.fecha < datos.hoy ? 'pasado' : ''}>
            <span className="ch-ev-fecha">
              {diaSemana(e.fecha)} {dia(e.fecha)}
            </span>
            <span>
              {e.evento}
              <span className={'chip' + (ok.includes(e.estado) ? ' good' : '')}>{e.estado}</span>
            </span>
            <span className="ch-ev-monto">{e.monto_ars != null ? plata(e.monto_ars) : ''}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ───────── a dónde fue el sueldo ─────────
function Destino({ capas }) {
  const [tarjetas, setTarjetas] = useState(true);
  const sueldo = n(capas[0]?.sueldo) || 1;

  const bloques = useMemo(() => {
    const m = new Map();
    capas.forEach((r) => {
      const conTarjeta = !!r.tarjeta;
      const enTarjetas = tarjetas && conTarjeta;
      const nombre = r.bloque === 'Queda' ? 'Queda' : enTarjetas ? 'Tarjetas de crédito' : r.bloque;
      const b = m.get(nombre) ?? { nombre, monto: 0, rubros: new Map() };
      const v = n(r.monto);
      b.monto += v;
      if (nombre !== 'Queda') {
        const rubro = enTarjetas ? `Resumen ${r.tarjeta}` : r.rubro;
        const etiqueta = enTarjetas ? r.rubro : r.subcategoria;
        const ru = b.rubros.get(rubro) ?? { nombre: rubro, monto: 0, subs: new Map() };
        ru.monto += v;
        const s = ru.subs.get(etiqueta) ?? { nombre: etiqueta, monto: 0, tarjeta: 0, extra: false };
        s.monto += v;
        if (conTarjeta && !enTarjetas) s.tarjeta += v;
        if (r.extraordinario) s.extra = true;
        ru.subs.set(etiqueta, s);
        b.rubros.set(rubro, ru);
      }
      m.set(nombre, b);
    });
    return ORDEN.filter((k) => m.has(k) && Math.abs(m.get(k).monto) > 0.004).map((k) => m.get(k));
  }, [capas, tarjetas]);

  const maxRubro = Math.max(1, ...bloques.flatMap((b) => [...b.rubros.values()].map((r) => r.monto)));

  return (
    <section className="card ch-sec">
      <div className="card-head">
        <div>
          <h3>¿A dónde fue el sueldo?</h3>
          <p className="card-sub">
            El 100% es el sueldo del ciclo, en tres capas: bloque, rubro y detalle. Los pagos de tarjeta se abren en lo que se compró con ellas.
          </p>
        </div>
        <label className="ch-toggle">
          <input type="checkbox" checked={tarjetas} onChange={(e) => setTarjetas(e.target.checked)} />
          Separar gastos con tarjeta de crédito
        </label>
      </div>
      <div className="ch-barra" role="img" aria-label="Reparto del sueldo por bloque">
        {bloques.map((b) => (
          <span
            key={b.nombre}
            style={{ width: `${Math.max(0, (b.monto / sueldo) * 100)}%`, background: COLORES[b.nombre] }}
            title={`${b.nombre}: ${plata(b.monto)} (${PCT.format(b.monto / sueldo)})`}
          />
        ))}
      </div>
      <div className="ch-capas">
        {bloques.map((b) =>
          b.nombre === 'Queda' ? (
            <div key="queda" className="ch-fila ch-queda">
              <span className="ch-fila-nom">
                <i className="ch-sw" style={{ background: COLORES.Queda }} />
                <span>Queda</span>
              </span>
              <b className="ch-pos">{plata(b.monto)}</b>
              <span className="ch-fila-pct">{PCT.format(b.monto / sueldo)}</span>
            </div>
          ) : (
            <details key={b.nombre} className="ch-blq">
              <summary>
                <Fila nombre={b.nombre} monto={b.monto} sueldo={sueldo} color={COLORES[b.nombre]} />
              </summary>
              <div className="ch-rubros">
                {[...b.rubros.values()]
                  .sort((x, y) => y.monto - x.monto)
                  .map((ru) => (
                    <details key={ru.nombre} className="ch-rub">
                      <summary>
                        <Fila nombre={ru.nombre} monto={ru.monto} sueldo={sueldo} />
                        <span className="ch-rub-barra" style={{ background: COLORES[b.nombre], width: `calc((100% - 1.6rem) * ${Math.max(0.01, ru.monto / maxRubro)})` }} />
                      </summary>
                      <ul className="ch-subs">
                        {[...ru.subs.values()]
                          .sort((x, y) => y.monto - x.monto)
                          .map((s) => (
                            <li key={s.nombre}>
                              <span>
                                {s.nombre}
                                {s.extra ? <span className="ch-tag">extraordinario</span> : null}
                                {s.tarjeta > 0.004 ? <span className="ch-tag">{Math.abs(s.tarjeta - s.monto) < 0.01 ? 'con tarjeta' : 'en parte con tarjeta'}</span> : null}
                              </span>
                              <span>{plata(s.monto)}</span>
                              <span className="ch-fila-pct">{PCT.format(s.monto / sueldo)}</span>
                            </li>
                          ))}
                      </ul>
                    </details>
                  ))}
              </div>
            </details>
          ),
        )}
      </div>
    </section>
  );
}

function Fila({ nombre, monto, sueldo, color }) {
  return (
    <span className="ch-fila">
      <span className="ch-fila-nom">
        <i className="ch-caret" aria-hidden="true">
          ▸
        </i>
        {color ? <i className="ch-sw" style={{ background: color }} /> : null}
        <span>{nombre}</span>
      </span>
      <span>{plata(monto)}</span>
      <span className="ch-fila-pct">{PCT.format(monto / sueldo)}</span>
    </span>
  );
}

// ───────── pendientes ─────────
function Pendientes({ pendientes }) {
  return (
    <section className="card ch-sec">
      <div className="card-head">
        <div>
          <h3>Pendientes del ciclo</h3>
          <p className="card-sub">Lo que todavía tiene que salir de este sueldo.</p>
        </div>
      </div>
      {pendientes.length ? (
        <ul className="ch-lista">
          {pendientes.map((p) => (
            <li key={p.id}>
              <div className="ch-lista-cab">
                <b>{p.concepto}</b>
                <span>{p.monto_estimado != null ? plata(p.monto_estimado) : 'Sin monto'}</span>
              </div>
              <div className="ch-lista-det">
                {p.estado}
                {p.vence ? ` · vence ${dia(p.vence)}` : ''}
              </div>
              {p.nota ? <div className="ch-lista-nota">{p.nota}</div> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="card-sub">No hay pendientes. 🎉</p>
      )}
    </section>
  );
}

// ───────── último resumen ─────────
function UltimoResumen({ filas }) {
  const total = filas.reduce((s, f) => s + n(f.total), 0);
  const max = Math.max(1, ...filas.map((f) => n(f.total)));
  const r = filas[0];
  return (
    <section className="card ch-sec">
      <div className="card-head">
        <div>
          <h3>Último resumen de tarjeta</h3>
          <p className="card-sub">{r ? `${r.tarjeta} · cierre ${dia(r.cierre)} · total ${plata(total)}` : 'Todavía no hay resúmenes cerrados.'}</p>
        </div>
      </div>
      <div className="ch-barras">
        {filas.map((f) => (
          <div key={f.categoria} className="ch-barras-fila">
            <span className="ch-barras-nom">{f.categoria}</span>
            <span className="ch-barras-pista">
              <span style={{ width: `${(n(f.total) / max) * 100}%` }} />
            </span>
            <span className="ch-barras-val">
              {plata0(f.total)} · {PCT.format(n(f.total) / (total || 1))}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ───────── movimientos ─────────
const MEDIOS = [
  { id: '', label: 'Todos' },
  { id: 'Mercado Pago', label: 'Mercado Pago' },
  { id: 'Cuenta Galicia', label: 'Galicia' },
  { id: 'VISA', label: 'VISA' },
  { id: 'AMEX', label: 'AMEX' },
];

function Movimientos({ movimientos }) {
  const [medio, setMedio] = useState('');
  const [q, setQ] = useState('');
  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    return movimientos.filter(
      (m) =>
        (!medio || String(m.medio).startsWith(medio)) &&
        (!t || [m.descripcion, m.referencia, m.categoria, m.subcategoria, m.rubro, m.nota, dia(m.fecha)].join(' ').toLowerCase().includes(t)),
    );
  }, [movimientos, medio, q]);
  return (
    <section className="card ch-sec">
      <div className="card-head">
        <div>
          <h3>Movimientos</h3>
          <p className="card-sub">Cuentas del ciclo y consumos de los últimos resúmenes de tarjeta.</p>
        </div>
      </div>
      <div className="ch-filtros">
        <div className="segmented sm" role="tablist" aria-label="Medio">
          {MEDIOS.map((m) => (
            <button key={m.id || 'todos'} type="button" className={medio === m.id ? 'on' : ''} onClick={() => setMedio(m.id)}>
              {m.label}
            </button>
          ))}
        </div>
        <input className="ch-buscar" type="search" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar movimientos" />
        <span className="ch-cuenta">{filtrados.length} movimientos</span>
      </div>
      <ul className="ch-movs">
        {filtrados.map((m) => (
          <li key={m.id} className={m.sentido.startsWith('interno') ? 'interno' : ''}>
            <span className="ch-mov-fecha">{dia(m.fecha)}</span>
            <span className="ch-mov-txt">
              <b>{m.descripcion}</b>
              <span className="ch-mov-cat">
                {m.medio} · {m.rubro ?? m.categoria} · {m.subcategoria}
                {m.cuota ? ` · cuota ${m.cuota}/${m.cuotas_total}` : ''}
              </span>
              {m.nota ? <span className="ch-mov-nota">{m.nota}</span> : null}
            </span>
            <span className={'ch-mov-monto' + (n(m.monto) > 0 ? ' ch-pos' : '')}>{plata(m.monto)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
