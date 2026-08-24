import React, { useState, useMemo } from 'react';
import { Station, FuelType } from '../types';
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

interface PricePoint {
  date: string;
  dayLabel: string;
  fullDate: string;
  SUPER: number;
  GAZOLE: number;
  MELANGE: number;
  KEROSENE: number;
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
    label: 'Gazole (Désel)',
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

  // Generate 7-day deterministic history based on station stock prices
  const historyData: PricePoint[] = useMemo(() => {
    const points: PricePoint[] = [];
    const now = new Date();
    const seed = station.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    const superBase = station.stock.SUPER?.pricePerLiter || 725;
    const gazoleBase = station.stock.GAZOLE?.pricePerLiter || 750;
    const melangeBase = station.stock.MELANGE?.pricePerLiter || 811;
    const keroseneBase = station.stock.KEROSENE?.pricePerLiter || 1040;

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);

      const dayName = d.toLocaleDateString('fr-FR', { weekday: 'short' });
      const dayNum = d.getDate().toString().padStart(2, '0');
      const monthNum = (d.getMonth() + 1).toString().padStart(2, '0');
      const dateLabel = i === 0 ? "Aujourd'hui" : `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${dayNum}/${monthNum}`;

      const varFactor = Math.sin((seed + i * 2) * 0.9);
      const superPrice = i === 0 ? superBase : Math.round(superBase + varFactor * 10);
      const gazolePrice = i === 0 ? gazoleBase : Math.round(gazoleBase + Math.cos((seed + i * 3) * 0.7) * 12);
      const melangePrice = i === 0 ? melangeBase : Math.round(melangeBase + Math.sin((seed + i * 4) * 0.5) * 8);
      const kerosenePrice = i === 0 ? keroseneBase : Math.round(keroseneBase + Math.cos((seed + i * 1.5) * 0.8) * 15);

      points.push({
        date: dateLabel,
        dayLabel: `${dayNum}/${monthNum}`,
        fullDate: d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
        SUPER: superPrice,
        GAZOLE: gazolePrice,
        MELANGE: melangePrice,
        KEROSENE: kerosenePrice,
      });
    }

    return points;
  }, [station]);

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
            <span>ANALYSE TARIFAIRE TOGO</span>
          </div>
          <h2 className="text-2xl font-black uppercase text-white tracking-tight flex items-center gap-2">
            Historique des prix (7 derniers jours)
          </h2>
        </div>

        {/* Fuel filter selector */}
        <div className="flex items-center gap-1.5 flex-wrap bg-neutral-900/90 p-1.5 rounded-xl border border-neutral-800">
          <button
            onClick={() => setSelectedFuel('ALL')}
            className={`px-3 py-1.5 text-xs font-bold uppercase rounded-lg transition-all ${
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
              className={`px-3 py-1.5 text-xs font-bold uppercase rounded-lg transition-all flex items-center gap-1.5 ${
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
          <div className="text-[10px] text-neutral-400 font-bold uppercase flex items-center gap-1">
            <Fuel className="w-3 h-3 text-amber-400" />
            <span>Carburant Affiché</span>
          </div>
          <div className="text-sm font-black text-amber-400 truncate">{stats.activeLabel}</div>
        </div>

        <div className="p-3 bg-neutral-900/80 border border-neutral-800 rounded-xl space-y-1">
          <div className="text-[10px] text-neutral-400 font-bold uppercase">Prix Actuel</div>
          <div className="text-base font-black text-white">{stats.currentPrice} FCFA / L</div>
        </div>

        <div className="p-3 bg-neutral-900/80 border border-neutral-800 rounded-xl space-y-1">
          <div className="text-[10px] text-neutral-400 font-bold uppercase">Min / Max (7 jours)</div>
          <div className="text-sm font-bold text-neutral-200">
            <span className="text-emerald-400">{stats.minPrice}</span> / <span className="text-amber-400">{stats.maxPrice}</span> FCFA
          </div>
        </div>

        <div className="p-3 bg-neutral-900/80 border border-neutral-800 rounded-xl space-y-1">
          <div className="text-[10px] text-neutral-400 font-bold uppercase">Tendance 7j</div>
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
                <Minus className="w-3.5 h-3.5" /> Stabilité officielle (0%)
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
                type="monotone"
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
                type="monotone"
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
                type="monotone"
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
                type="monotone"
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

      <div className="flex items-center gap-2 text-[11px] text-neutral-400 bg-neutral-900/60 p-3 rounded-xl border border-neutral-800">
        <Info className="w-4 h-4 text-amber-400 shrink-0" />
        <span>
          Les prix affichés sont réglementés par le Ministère du Commerce du Togo et mis à jour quotidiennement pour la station <strong>{station.name}</strong>.
        </span>
      </div>
    </div>
  );
};
