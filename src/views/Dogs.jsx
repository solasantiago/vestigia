import { useMemo } from 'react';
import { useApp } from '../lib/appctx.js';
import { useData } from '../lib/data.jsx';
import { addDays, dayOf, fmtDayCompact, fmtDayShort, fmtDuration, fmtTime, range } from '../lib/dates.js';
import { fmt1, fmtInt, fmtPct, fmtSigned, fmtKg } from '../lib/format.js';
import { foodStock, mealsCompliance, mean, poopPerDay, walkHourHistogram, walksPerDay } from '../lib/metrics.js';
import { ChartCard } from '../components/charts/core.jsx';
import { ColumnChart } from '../components/charts/ColumnChart.jsx';
import { DayGrid } from '../components/charts/DayGrid.jsx';
import { Meter, StatTile } from '../components/charts/Figures.jsx';
import { Card, Chip, SectionTitle } from '../components/ui.jsx';
import { DogsCard } from './Today.jsx';
import { DOG_COLOR, EventRow } from './common.jsx';

const POOP_LABEL = { si: 'Sí', no: 'No', raro: 'Algo raro' };

export default function Dogs() {
  const { model } = useData();
  const { today, days, prevDays, period, startDate } = useApp();
  const goal = model.dogs.map((d) => d.walks_goal).find((g) => g != null) ?? null;
  const pastDays = days.filter((d) => d < today);
  const perDay = useMemo(() => walksPerDay(model, days), [model, days]);
  const perDayPrev = useMemo(() => walksPerDay(model, prevDays), [model, prevDays]);
  const past = perDay.filter((r) => r.day < today);
  const avgWalks = mean(past.map((r) => r.total));
  const prevAvg = perDayPrev.length && perDayPrev.some((r) => r.total) ? mean(perDayPrev.map((r) => r.total)) : null;
  const periodWalks = model.walks.filter((w) => w.day >= days[0] && w.day <= today);
  const avgMin = mean(periodWalks.map((w) => w.minutes));
  const daysAtGoal = goal ? past.filter((r) => r.total >= goal).length : null;
  const hist = walkHourHistogram(model, days).filter((h) => h.hour >= 6);
  const food = foodStock(model, today);
  const meals = mealsCompliance(model, pastDays);
  const start90 = addDays(today, -90) < startDate ? startDate : addDays(today, -90);
  const days90 = range(start90, today);
  const upcoming = model.events.filter((e) => e.category === 'perros' && dayOf(e.starts_at) >= today).slice(0, 4);

  return (
    <div className="stack">
      {days.length < 7 ? (
        <p className="lede">
          Vestigia registra desde el {Number(startDate.slice(8, 10))}/{Number(startDate.slice(5, 7))}: con cada paseo y cada comida, estos gráficos se van llenando.
        </p>
      ) : null}
      <div className="kpis">
        <StatTile
          label="Paseos por día"
          value={fmt1(avgWalks)}
          unit={goal ? `/ meta ${goal}` : undefined}
          delta={avgWalks != null && prevAvg != null ? { value: avgWalks - prevAvg, text: fmtSigned(avgWalks - prevAvg) } : null}
          deltaLabel={`vs ${period} días anteriores`}
          sub={`${daysAtGoal} de ${past.length} días llegaron a la meta`}
        />
        <StatTile label="Duración promedio" value={fmtDuration(avgMin)} sub={`${fmtInt(periodWalks.length)} paseos en el período`} />
        <StatTile label="Comidas registradas" value={fmtPct(meals)} sub="Días con desayuno y cena cargados" />
        <StatTile
          label="Alimento"
          value={food?.daysLeft != null ? `~${Math.max(0, Math.round(food.daysLeft))}` : '—'}
          unit="días"
          sub={food?.refillEvery != null ? `Refill cada ${fmt1(food.refillEvery)} días en promedio` : food ? 'Todavía sin refills' : 'Falta cargar la bolsa'}
        />
      </div>

      <div className="grid two">
        <DogsCard showFood={false} />
        <ChartCard
          title="Paseos por día"
          subtitle="Cada salida cuenta una vez, vayan uno o los dos"
          table={{
            columns: [
              { key: 'day', label: 'Día', fmt: (v) => fmtDayCompact(v) },
              { key: 'total', label: 'Salidas', num: true },
              { key: 'mocka', label: 'Mocka', num: true },
              { key: 'honey', label: 'Honey', num: true },
              { key: 'minutes', label: 'Minutos', num: true },
            ],
            rows: perDay,
          }}
        >
          <ColumnChart
            ariaLabel="Paseos por día"
            data={perDay.map((r) => ({ key: r.day, label: fmtDayShort(r.day), title: fmtDayCompact(r.day), values: { n: r.day === today && !r.total ? null : r.total } }))}
            stack={[{ key: 'n', label: 'Paseos', color: 'var(--accent)' }]}
            fmtY={(v) => String(Math.round(v))}
            yMax={Math.max(4, ...perDay.map((r) => r.total))}
            goal={goal ? { value: goal, label: `Meta ${goal}` } : undefined}
          />
        </ChartCard>
      </div>

      <div className="grid two">
        <ChartCard
          title="A qué hora salen"
          subtitle="Cantidad de paseos que empezaron en cada hora"
          table={{ columns: [{ key: 'label', label: 'Hora' }, { key: 'n', label: 'Paseos', num: true }], rows: hist }}
        >
          <ColumnChart
            ariaLabel="Paseos por hora del día"
            data={hist.map((h) => ({ key: h.key, label: String(h.hour), title: `De ${h.hour}:00 a ${h.hour}:59`, values: { n: h.n } }))}
            yMax={Math.max(4, ...hist.map((h) => h.n))}
            stack={[{ key: 'n', label: 'Paseos', color: 'var(--accent)' }]}
            labelMinGap={26}
          />
        </ChartCard>
        <Card title="Comida y stock" subtitle="Se calcula con la ración diaria de cada uno">
          {food ? (
            <div className="food big">
              <div className="food-head">
                <span>Queda para</span>
                <strong>{food.daysLeft != null ? `~${Math.max(0, Math.round(food.daysLeft))} días` : '—'}</strong>
              </div>
              {food.daysLeft != null ? (
                <Meter
                  value={food.pct}
                  label="Alimento restante"
                  tone={food.daysLeft <= 2 ? 'critical' : model.settings?.food_alert_days && food.daysLeft <= model.settings.food_alert_days ? 'warning' : 'accent'}
                />
              ) : (
                <p className="muted small">Falta la ración diaria de los perros para calcular cuánto queda.</p>
              )}
              <dl className="facts">
                <div>
                  <dt>Última bolsa</dt>
                  <dd>
                    {fmtKg(food.last.kg)} kg · {fmtDayCompact(food.last.bought_on)} · {model.peopleById.get(food.last.bought_by)?.short_name}
                  </dd>
                </div>
                <div>
                  <dt>Consumo</dt>
                  <dd>{food.dailyG ? `${fmtInt(food.dailyG)} g por día` : '—'}</dd>
                </div>
                <div>
                  <dt>Refills desde la compra</dt>
                  <dd>{food.refillsSince}</dd>
                </div>
                <div>
                  <dt>Último refill</dt>
                  <dd>{food.lastRefill ? `${fmtDayCompact(dayOf(food.lastRefill.at))} ${fmtTime(food.lastRefill.at)}` : '—'}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <p className="empty">Cargá la primera compra de alimento.</p>
          )}
        </Card>
      </div>

      <SectionTitle sub="Últimos 90 días. Sirve para mostrarle el historial al veterinario.">Caca, perro por perro</SectionTitle>
      <div className="grid two">
        {model.dogs.map((d) => {
          const poops = poopPerDay(model, d.id, days90);
          const byDay = new Map(poops.map((p) => [p.day, p]));
          const raros = poops.filter((p) => p.raro);
          const noPoop = poops.filter((p) => p.day < today && !p.si && !p.raro).length;
          return (
            <ChartCard
              key={d.id}
              title={d.name}
              subtitle={[d.weight_kg != null ? `${fmtDecimal(d.weight_kg)} kg` : null, d.daily_ration_g ? `${d.daily_ration_g} g de alimento por día` : null, d.vet].filter(Boolean).join(' · ') || 'Sin datos de la ficha todavía'}
              legend={[
                { label: 'Hizo', color: DOG_COLOR[d.id] },
                { label: 'Algo raro', color: 'var(--status-critical)' },
                { label: 'No hizo', color: 'var(--state-no)' },
              ]}
              footnote={
                raros.length
                  ? `Algo raro: ${raros.map((p) => `${fmtDayShort(p.day)} (${p.details.join(', ') || 'sin detalle'})`).join(' · ')}. ${noPoop} ${noPoop === 1 ? 'día' : 'días'} sin caca registrada.`
                  : `${noPoop} ${noPoop === 1 ? 'día' : 'días'} sin caca registrada.`
              }
            >
              <DayGrid
                ariaLabel={`Caca de ${d.name}, últimos 90 días`}
                start={start90}
                end={today}
                maxCell={18}
                cell={(day) => {
                  const p = byDay.get(day);
                  if (!p) return null;
                  if (p.raro) return { fill: 'var(--status-critical)', label: `Algo raro: ${p.details.join(', ') || 'sin detalle'}` };
                  if (p.si) return { fill: DOG_COLOR[d.id], label: p.si === 1 ? '1 vez' : `${p.si} veces` };
                  if (day === today) return { fill: 'transparent', ring: true, label: 'Hoy, todavía no' };
                  return { fill: 'var(--state-no)', label: 'Sin caca registrada' };
                }}
              />
            </ChartCard>
          );
        })}
      </div>

      <div className="grid two wide-left">
        <ChartCard title="Últimos paseos" subtitle="Quién, cuánto y qué pasó">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Cuándo</th>
                  <th>Quién</th>
                  <th className="num">Duración</th>
                  <th>Caca</th>
                </tr>
              </thead>
              <tbody>
                {model.walks
                  .slice(-12)
                  .reverse()
                  .map((w) => (
                    <tr key={w.id}>
                      <td>
                        {w.day === today ? 'Hoy' : fmtDayCompact(w.day)} {fmtTime(w.started_at)}
                      </td>
                      <td>{model.peopleById.get(w.walker_id)?.short_name}</td>
                      <td className="num">{fmtDuration(w.minutes)}</td>
                      <td>
                        {w.dogs.map((x) => (
                          <span key={x.dog_id} className="poop-cell">
                            {model.dogs.find((dd) => dd.id === x.dog_id)?.name}: {POOP_LABEL[x.poop] ?? '—'}
                            {x.poop === 'raro' && x.poop_detail ? ` (${x.poop_detail})` : ''}
                          </span>
                        ))}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
        <Card title="Salud: próximos" subtitle="Vacunas, antipulgas y turnos">
          {upcoming.length ? (
            <ul className="events">
              {upcoming.map((e) => (
                <EventRow key={e.id} ev={e} today={today} people={model.peopleById} />
              ))}
            </ul>
          ) : (
            <p className="empty">Nada agendado.</p>
          )}
          <div className="chips-row">
            {model.dogs.map((d) => (
              <Chip key={d.id} icon="🐕">
                {d.name}: {d.walks_goal ? `meta ${d.walks_goal} paseos` : 'sin meta de paseos'}
              </Chip>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function fmtDecimal(v) {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(Number(v));
}
