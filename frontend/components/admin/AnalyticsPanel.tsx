'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { adminApi } from '@/lib/api/admin';
import { toApiError } from '@/lib/api-client';
import { FormAlert } from '@/components/ui/form-alert';
import { cn } from '@/lib/utils';

/**
 * Analytics dashboard.
 *
 * Chart colours come from the design tokens rather than Recharts' defaults, so
 * the charts belong to the same system as the rest of the UI instead of looking
 * like an embedded third-party widget. Axes are deliberately sparse: the shape
 * of the line is the message, and gridlines competing with it is noise.
 */

const ACCENT = '#F0B429';
const SECONDARY = '#5B8DEF';
const AXIS = '#71717F';
const GRID = 'rgba(255,255,255,0.06)';

const WINDOWS = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
];

export function AnalyticsPanel() {
  const [days, setDays] = useState(30);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-analytics', days],
    queryFn: () => adminApi.analytics(days),
  });

  if (isError) return <FormAlert tone="danger">{toApiError(error).message}</FormAlert>;

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="skeleton h-24 rounded-panel" aria-hidden="true" />
          ))}
        </div>
        <div className="skeleton h-72 rounded-panel" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold tracking-tight">Overview</h2>
        <div className="flex gap-1" role="group" aria-label="Time window">
          {WINDOWS.map((option) => (
            <button
              key={option.days}
              type="button"
              onClick={() => setDays(option.days)}
              aria-pressed={days === option.days}
              className={cn(
                'rounded-control px-3 py-1.5 text-sm transition-colors',
                days === option.days
                  ? 'bg-accent text-fg-inverse'
                  : 'border border-line text-fg-muted hover:text-fg',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Accounts" value={data.totals.users} />
        <Stat label="Profiles" value={data.totals.profiles} />
        <Stat label="Watch hours" value={data.totals.watchHours} />
        <Stat
          label="Stickiness"
          value={`${data.activity.stickiness}%`}
          hint={`${data.activity.dau} DAU / ${data.activity.mau} MAU`}
        />
        <Stat label="Films" value={data.totals.movies} />
        <Stat label="Series" value={data.totals.shows} hint={`${data.totals.episodes} episodes`} />
        <Stat label="Ratings" value={data.totals.ratings} />
        <Stat label="Reviews" value={data.totals.reviews} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="New accounts" subtitle={`Sign-ups per day, last ${days} days`}>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data.userGrowth} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ACCENT} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: AXIS, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                // Only month-day; the year is constant across the window and
                // full ISO dates would collide at this width.
                tickFormatter={(value: string) => value.slice(5)}
                minTickGap={24}
              />
              <YAxis tick={{ fill: AXIS, fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<DarkTooltip suffix=" accounts" />} />
              <Area type="monotone" dataKey="value" stroke={ACCENT} strokeWidth={2} fill="url(#growthFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Watch hours" subtitle={`Hours watched per day, last ${days} days`}>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data.watchHours} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="hoursFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={SECONDARY} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={SECONDARY} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: AXIS, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: string) => value.slice(5)}
                minTickGap={24}
              />
              <YAxis tick={{ fill: AXIS, fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip content={<DarkTooltip suffix=" hours" />} />
              <Area type="monotone" dataKey="value" stroke={SECONDARY} strokeWidth={2} fill="url(#hoursFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top genres" subtitle="By number of titles watched">
          {data.topGenres.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={data.topGenres}
                layout="vertical"
                margin={{ top: 4, right: 12, bottom: 0, left: 40 }}
              >
                <CartesianGrid stroke={GRID} horizontal={false} />
                <XAxis type="number" tick={{ fill: AXIS, fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="genre"
                  tick={{ fill: AXIS, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={90}
                />
                <Tooltip content={<DarkTooltip suffix=" watches" />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="watchCount" fill={ACCENT} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Rating distribution" subtitle="How viewers score titles">
          {data.ratingDistribution.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.ratingDistribution} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis
                  dataKey="score"
                  tick={{ fill: AXIS, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value: number) => `${value}★`}
                />
                <YAxis tick={{ fill: AXIS, fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<DarkTooltip suffix=" ratings" />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {data.ratingDistribution.map((entry) => (
                    // Low scores in the secondary colour so the split between
                    // approval and disapproval reads at a glance.
                    <Cell key={entry.score} fill={entry.score >= 3.5 ? ACCENT : SECONDARY} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <section className="rounded-panel border border-line">
        <h3 className="border-b border-line px-4 py-3 text-sm font-semibold">Most watched</h3>
        {data.topTitles.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-fg-subtle">
            Nothing watched yet.
          </p>
        ) : (
          <ol className="divide-y divide-line">
            {data.topTitles.map((title, index) => (
              <li key={title.slug} className="flex items-center gap-3 px-4 py-2.5">
                <span className="w-5 text-sm text-fg-subtle tabular-nums">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate text-sm">{title.title}</span>
                <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[11px] uppercase text-fg-subtle">
                  {title.mediaType === 'tv' ? 'Series' : 'Film'}
                </span>
                <span className="text-sm text-fg-muted tabular-nums">★ {title.averageScore}</span>
                <span className="w-16 text-right text-sm tabular-nums">{title.watchCount}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-panel border border-line p-4">
      <p className="text-xs uppercase tracking-wide text-fg-subtle">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-fg-subtle">{hint}</p>}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-panel border border-line p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mb-3 text-xs text-fg-subtle">{subtitle}</p>
      {children}
    </section>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-60 items-center justify-center text-sm text-fg-subtle">
      Not enough data yet.
    </div>
  );
}

/** Recharts' default tooltip is light-themed; this matches the app's surfaces. */
function DarkTooltip({
  active,
  payload,
  label,
  suffix = '',
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string | number;
  suffix?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-control border border-line bg-surface-overlay px-3 py-2 text-xs shadow-xl">
      <p className="text-fg-subtle">{label}</p>
      <p className="font-semibold text-fg">
        {payload[0]!.value}
        {suffix}
      </p>
    </div>
  );
}
