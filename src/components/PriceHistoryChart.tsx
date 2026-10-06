import React, { useEffect, useMemo, useState } from 'react';
import { Station, FuelType, PriceChange } from '../types';
import { api } from '../api';
import { buildDailySeries } from '../priceHistory';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, Calendar, Fuel, Info } from 'lucide-react';

interface PriceHistoryChartProps {
  station: Station;
}

const FUEL_CONFIG: Record<
  FuelType,
  { label: string; color: string; gradientId: string }
> = {
  SUPER: {
    label: 'Super Sans Plomb',
    color: '#f59e0b', // Amber
    gradientId: 'colorSuper',
  },
  GAZOLE: {
    label: 'Gazole (Diesel)',
    color: '#3b82f6', // Blue
    gradientId: 'colorGazole',
  },
  MELANGE: {
    label: 'Mélange 2 Temps',
    color: '#10b981', // Emerald
    gradientId: 'colorMelange',
  },
  KEROSENE: {
    label: 'Pétrole / Kérosène',
    color: '#a855f7', // Purple
    gradientId: 'colorKerosene',
  },
};

export const PriceHistoryChart: React.FC<PriceHistoryChartProps> = ({ station }) => {
  const [selectedFuel, setSelectedFuel] = useState<FuelType | 'ALL'>('ALL');

  const [days, setDays] = useState<7 | 30>(7);
  const [changes, setChanges] = useState<PriceChange[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    api
      .priceHistory(station.id, 30, controller.signal)
      .then(setChanges)
      // Without the server the chart shows today's prices only.
      .catch(() => setChanges([]));
    return () => controller.abort();
  }, [station.id]);

  const historyData = useMemo(() => buildDailySeries(changes, station, days), [changes, station, days]);

  // Statistics for selected fuel
  const stats = useMemo(() => {
    const activeKey: FuelType = selectedFuel === 'ALL' ? 'SUPER' : selectedFuel;
    const prices = historyData.map((d) => d[activeKey]);
    const currentPrice = prices[prices.length - 1];
    const initialPrice = prices[0];
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const diff = currentPrice - initialPrice;
    const diffPercent = initialPrice !== 0 ? ((diff / initialPrice) * 100).toFixed(1) : '0';

    return {
      currentPrice,
      minPrice,
      maxPrice,
      diff,
      diffPercent,
      activeLabel: FUEL_CONFIG[activeKey].label,
    };
  }, [historyData, selectedFuel]);

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black/95 border border-neutral-700 p-3 rounded-xl shadow-2xl backdrop-blur-xl text-xs space-y-2">
          <div className="font-bold text-amber-400 border-b border-neutral-800 pb-1 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>{label}</span>
          </div>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => {
              const fuelKey = entry.dataKey as FuelType;
              const config = FUEL_CONFIG[fuelKey];
              return (
                <div key={`item-${index}`} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-neutral-300 font-semibold">{config?.label || entry.name}:</span>
                  </div>
                  <span className="font-black text-white">{entry.value} FCFA / L</span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div id="station-price-history-section" className="border border-neutral-800 bg-black/85 backdrop-blur-xl p-6 rounded-2xl text-white space-y-6 shadow-2xl">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <div className="text-xs text-amber-400 font-bold uppercase tracking-widest flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            <span>Analyse tarifaire Togo</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Historique des prix ({days} derniers jours)
          </h2>
          <div className="mt-2 inline-flex rounded-lg border border-neutral-800 p-0.5 text-xs font-bold">
            {([7, 30] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-2.5 py-1 rounded-md ${days === d ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'}`}
              >
                {d} jours
              </button>
            ))}
          </div>
        </div>

        {/* Fuel filter selector */}
        <div className="flex items-center gap-1.5 flex-wrap bg-neutral-900/90 p-1.5 rounded-xl border border-neutral-800">
          <button
            onClick={() => setSelectedFuel('ALL')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              selectedFuel === 'ALL'
                ? 'bg-amber-400 text-black shadow-md'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            Tous les carburants
          </button>
          {(Object.keys(FUEL_CONFIG) as FuelType[]).map((type) => (
            <button
              key={type}
              onClick={() => setSelectedFuel(type)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                selectedFuel === type
                  ? 'bg-amber-400 text-black shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: FUEL_CONFIG[type].color }}
              />
              <span>{type}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPI stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 bg-neutral-900/80 border border-neutral-800 rounded-xl space-y-1">
          <div className="text-[11px] text-neutral-400 font-bold uppercase flex items-center gap-1">
            <Fuel className="w-3 h-3 text-amber-400" />
            <span>Carburant Affiché</span>
          </div>
          <div className="text-sm font-black text-amber-400 truncate">{stats.activeLabel}</div>
        </div>

        <div className="p-3 bg-neutral-900/80 border border-neutral-800 rounded-xl space-y-1">
          <div className="text-[11px] text-neutral-400 font-bold uppercase">Prix Actuel</div>
          <div className="text-base font-black text-white">{stats.currentPrice} FCFA / L</div>
        </div>

        <div className="p-3 bg-neutral-900/80 border border-neutral-800 rounded-xl space-y-1">
          <div className="text-[11px] text-neutral-400 font-bold uppercase">Min / Max ({days} jours)</div>
          <div className="text-sm font-bold text-neutral-200">
            <span className="text-emerald-400">{stats.minPrice}</span> / <span className="text-amber-400">{stats.maxPrice}</span> FCFA
          </div>
        </div>

        <div className="p-3 bg-neutral-900/80 border border-neutral-800 rounded-xl space-y-1">
          <div className="text-[11px] text-neutral-400 font-bold uppercase">Tendance {days}j</div>
          <div className="flex items-center gap-1 text-xs font-black">
            {stats.diff > 0 ? (
              <span className="text-rose-400 flex items-center gap-0.5">
                <TrendingUp className="w-3.5 h-3.5" /> +{stats.diff} FCFA ({stats.diffPercent}%)
              </span>
            ) : stats.diff < 0 ? (
              <span className="text-emerald-400 flex items-center gap-0.5">
                <TrendingDown className="w-3.5 h-3.5" /> {stats.diff} FCFA ({stats.diffPercent}%)
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-0.5">
                <Minus className="w-3.5 h-3.5" /> Prix stable (0%)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Recharts Area */}
      <div className="h-72 sm:h-80 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={historyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorSuper" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorGazole" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorMelange" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorKerosene" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />

            <XAxis
              dataKey="date"
              stroke="#888888"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#333' }}
            />

            <YAxis
              stroke="#888888"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#333' }}
              domain={['auto', 'auto']}
              tickFormatter={(value) => `${value}`}
              unit=" FCFA"
            />

            <Tooltip content={<CustomTooltip />} />

            <Legend
              wrapperStyle={{ paddingTop: '15px', fontSize: '11px' }}
              formatter={(value: string) => {
                const config = FUEL_CONFIG[value as FuelType];
                return <span className="text-neutral-300 font-bold">{config?.label || value}</span>;
              }}
            />

            {(selectedFuel === 'ALL' || selectedFuel === 'SUPER') && (
              <Area
                type="stepAfter"
                dataKey="SUPER"
                name="SUPER"
                stroke={FUEL_CONFIG.SUPER.color}
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorSuper)"
                activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
              />
            )}

            {(selectedFuel === 'ALL' || selectedFuel === 'GAZOLE') && (
              <Area
                type="stepAfter"
                dataKey="GAZOLE"
                name="GAZOLE"
                stroke={FUEL_CONFIG.GAZOLE.color}
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorGazole)"
                activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
              />
            )}

            {(selectedFuel === 'ALL' || selectedFuel === 'MELANGE') && (
              <Area
                type="stepAfter"
                dataKey="MELANGE"
                name="MELANGE"
                stroke={FUEL_CONFIG.MELANGE.color}
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorMelange)"
                activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
              />
            )}

            {(selectedFuel === 'ALL' || selectedFuel === 'KEROSENE') && (
              <Area
                type="stepAfter"
                dataKey="KEROSENE"
                name="KEROSENE"
                stroke={FUEL_CONFIG.KEROSENE.color}
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorKerosene)"
                activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-2 text-xs text-neutral-400 bg-neutral-900/60 p-3 rounded-xl border border-neutral-800">
        <Info className="w-4 h-4 text-amber-400 shrink-0" />
        <span>
          Prix réellement pratiqués par la station <strong>{station.name}</strong>, enregistrés à chaque changement de tarif.
        </span>
      </div>
    </div>
  );
};
