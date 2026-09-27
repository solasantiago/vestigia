import { useMemo } from 'react';
import { useKiosk } from '../lib/kiosk.jsx';
import { computeDay } from '../lib/status.js';
import { useApp } from '../lib/appctx.js';
import { useData } from '../lib/data.jsx';
import { addDays, calDayOf, calTodayISO, fmtDayCompact, fmtDayShort, fmtDuration, fmtTime, range } from '../lib/dates.js';
import { fmt1, fmtInt, fmtSigned } from '../lib/format.js';
import { feedingPerDay, mean, poopPerDay, walkHourHistogram, walksPerDay } from '../lib/metrics.js';
import { ChartCard } from '../components/charts/core.jsx';
import { ColumnChart } from '../components/charts/ColumnChart.jsx';
import { DayGrid } from '../components/charts/DayGrid.jsx';
import { BarList, StatTile } from '../components/charts/Figures.jsx';
import { Card, Chip, SectionTitle } from '../components/ui.jsx';
import { DogsPanel, FoodBlock, TREAT_LABEL } from '../components/DogsPanel.jsx';
import { DOG_COLOR, EventRow } from './common.jsx';

const KIND_COLOR = { corta: 'var(--cat-3)', larga: 'var(--cat-2)' };

export default function Dogs() {
  const { model } = useData();
  const { today, now, days, prevDays, period, startDate, person } = useApp();
  const kiosk = useKiosk();
  const who = person === 'casa' ? kiosk.who : person;
  const st = useMemo(() => computeDay(model, { day: today, now }), [model, today, now]);
  const calToday = calTodayISO(new Date(now));
  const goal = model.settings?.walks_goal ?? null;
  const longGoal = model.settings?.long_walks_goal ?? null;
  const perDay = useMemo(() => walksPerDay(model, days), [model, days]);
  const perDayPrev = useMemo(() => walksPerDay(model, prevDays), [model, prevDays]);
  const feeding = useMemo(() => feedingPerDay(model, days), [model, days]);
  const past = perDay.filter((r) => r.day < today);
  const avgWalks = mean(past.map((r) => r.total));
  const avgLong = mean(past.map((r) => r.larga));
  const prevAvg = perDayPrev.some((r) => r.total) ? mean(perDayPrev.map((r) => r.total)) : null;
  const periodWalks = model.walks.filter((w) => w.day >= days[0] && w.day <= today);
  const longWalks = periodWalks.filter((w) => w.kind === 'larga');
  const avgLongMin = mean(longWalks.map((w) => w.minutes));
  const stairsPct = longWalks.length ? longWalks.filter((w) => w.stairs).length / longWalks.length : null;
  const daysAtGoal = goal ? past.filter((r) => r.total >= goal && (!longGoal || r.larga >= longGoal)).length : null;
  const hist = walkHourHistogram(model, days).filter((h) => h.hour >= 6);
  const pastFeeding = feeding.filter((r) => r.day < today);
  const periodTreats = model.treats.filter((t) => t.day >= days[0] && t.day <= today);
  const treatKinds = Object.entries(
    periodTreats.reduce((acc, t) => ({ ...acc, [t.kind]: (acc[t.kind] ?? 0) + 1 }), {}),
  )
    .map(([k, n]) => ({ key: k, label: TREAT_LABEL[k] ?? k, value: n }))
    .sort((a, b) => b.value - a.value);
  const start90 = addDays(today, -90) < startDate ? startDate : addDays(today, -90);
  const days90 = range(start90, today);
  const upcoming = model.events.filter((e) => e.category === 'perros' && calDayOf(e.starts_at) >= calToday).slice(0, 4);

  return (
    <div className="stack">
      {days.length < 7 ? (
        <p className="lede">
          Vestigia registra desde el {Number(startDate.slice(8, 10))}/{Number(startDate.slice(5, 7))}: con cada salida, carga de tarritos y premio, estos gráficos se van llenando.
        </p>
      ) : null}
      <div className="kpis">
        <StatTile
          label="Salidas por día"
          value={fmt1(avgWalks)}
          unit={goal ? `/ meta ${goal}` : undefined}
          delta={avgWalks != null && prevAvg != null ? { value: avgWalks - prevAvg, text: fmtSigned(avgWalks - prevAvg) } : null}
          deltaLabel={`vs ${period} días anteriores`}
          sub={past.length ? `${daysAtGoal ?? '—'} de ${past.length} ${past.length === 1 ? 'día llegó' : 'días llegaron'} a la meta` : 'Se cuenta desde mañana, con el día completo'}
        />
        <StatTile
          label="Paseos largos por día"
          value={fmt1(avgLong)}
          unit={longGoal ? `/ meta ${longGoal}` : undefined}
          sub={longWalks.length ? `Duran ${fmtDuration(avgLongMin)} en promedio` : 'Todavía sin paseos largos'}
        />
        <StatTile
          label="Escalera al volver"
          value={stairsPct == null ? '—' : `${Math.round(stairsPct * 100)}%`}
          sub="De los paseos largos, cuántos terminaron subiendo los 2 pisos"
        />
        <StatTile
          label="Tarritos por día"
          value={fmt1(mean(pastFeeding.map((r) => r.refills)))}
          sub={`${fmtInt(periodTreats.length)} ${periodTreats.length === 1 ? 'premio' : 'premios'} en el período`}
        />
      </div>

      <div className="grid two">
        <DogsPanel st={st} who={who} calm={model.acks.has(today)} />
        <ChartCard
          title="Salidas por día"
          subtitle="Cada salida cuenta una vez, vayan una o las dos"
          legend={[
            { label: 'Paseo largo', color: KIND_COLOR.larga },
            { label: 'Salida corta', color: KIND_COLOR.corta },
          ]}
          table={{
            columns: [
              { key: 'day', label: 'Día', fmt: (v) => fmtDayCompact(v) },
              { key: 'total', label: 'Salidas', num: true },
              { key: 'larga', label: 'Largas', num: true },
              { key: 'corta', label: 'Cortas', num: true },
              { key: 'minutes', label: 'Minutos', num: true },
            ],
            rows: perDay,
          }}
        >
          <ColumnChart
            ariaLabel="Salidas por día"
            data={perDay.map((r) => ({
              key: r.day,
              label: fmtDayShort(r.day),
              title: fmtDayCompact(r.day),
              values: r.day === today && !r.total ? { larga: null, corta: null } : { larga: r.larga, corta: r.corta },
            }))}
            stack={[
              { key: 'larga', label: 'Paseos largos', color: KIND_COLOR.larga },
              { key: 'corta', label: 'Salidas cortas', color: KIND_COLOR.corta },
            ]}
            fmtY={(v) => String(Math.round(v))}
            yMax={Math.max(6, ...perDay.map((r) => r.total))}
            goal={goal ? { value: goal, label: `Meta ${goal}` } : undefined}
          />
        </ChartCard>
      </div>

      <div className="grid two">
        <ChartCard
          title="Cargas de tarritos por día"
          subtitle="Cada vez que se les puso comida"
          table={{
            columns: [
              { key: 'day', label: 'Día', fmt: (v) => fmtDayCompact(v) },
              { key: 'refills', label: 'Tarritos', num: true },
              { key: 'treats', label: 'Premios', num: true },
            ],
            rows: feeding,
          }}
        >
          <ColumnChart
            ariaLabel="Cargas de tarritos por día"
            data={feeding.map((r) => ({ key: r.day, label: fmtDayShort(r.day), title: fmtDayCompact(r.day), values: { n: r.day === today && !r.refills ? null : r.refills } }))}
            stack={[{ key: 'n', label: 'Cargas', color: 'var(--accent)' }]}
            fmtY={(v) => String(Math.round(v))}
            yMax={Math.max(4, ...feeding.map((r) => r.refills))}
          />
        </ChartCard>
        <Card title="Alimento y premios" subtitle="La bolsa en uso y los premios del período">
          <FoodBlock who={who} />
          <h4 className="mini-title">Premios del período</h4>
          <BarList items={treatKinds} fmt={(v) => fmtInt(v)} emptyText="Todavía sin premios anotados." />
        </Card>
      </div>

      <ChartCard
        title="A qué hora salen"
        subtitle="Cantidad de salidas que empezaron en cada hora"
        table={{ columns: [{ key: 'label', label: 'Hora' }, { key: 'n', label: 'Salidas', num: true }], rows: hist }}
      >
        <ColumnChart
          ariaLabel="Salidas por hora del día"
          data={hist.map((h) => ({ key: h.key, label: String(h.hour), title: `De ${h.hour}:00 a ${h.hour}:59`, values: { n: h.n } }))}
          yMax={Math.max(4, ...hist.map((h) => h.n))}
          stack={[{ key: 'n', label: 'Salidas', color: 'var(--accent)' }]}
          labelMinGap={26}
          height={170}
        />
      </ChartCard>

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
        <ChartCard title="Últimas salidas" subtitle="Quién, cuánto y qué pasó">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Cuándo</th>
                  <th>Quién</th>
                  <th>Tipo</th>
                  <th className="num">Duración</th>
                  <th>Pis y caca</th>
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
                      <td>{w.kind === 'larga' ? `Largo${w.stairs ? ' · escalera' : ''}` : 'Corta'}</td>
                      <td className="num">{fmtDuration(w.minutes)}</td>
                      <td>
                        {w.dogs.map((x) => (
                          <span key={x.dog_id} className="poop-cell">
                            {model.dogs.find((dd) => dd.id === x.dog_id)?.name}: {x.pee ? '💧' : ''}
                            {x.poop === 'si' ? '💩' : x.poop === 'raro' ? `⚠️ caca ${x.poop_detail ?? 'rara'}` : ''}
                            {!x.pee && x.poop === 'no' ? 'nada' : ''}
                            {x.note ? ` · ${x.note}` : ''}
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
                <EventRow key={e.id} ev={e} today={calToday} people={model.peopleById} />
              ))}
            </ul>
          ) : (
            <p className="empty">Nada agendado.</p>
          )}
          <div className="chips-row">
            {model.dogs.map((d) => (
              <Chip key={d.id} icon="🐕">
                {d.name}
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
