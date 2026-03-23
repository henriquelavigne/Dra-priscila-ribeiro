"use client";

interface ChartPoint {
  monthLabel: string;
  expected: number;
  received: number;
}

interface RevenueChartProps {
  data: ChartPoint[];
}

function formatK(value: number): string {
  if (value === 0) return "R$0";
  if (value >= 1000) return `R$${(value / 1000).toFixed(1)}k`;
  return `R$${Math.round(value)}`;
}

export function RevenueChart({ data }: RevenueChartProps) {
  const maxValue = Math.max(...data.flatMap((d) => [d.expected, d.received]), 1);

  const BAR_H = 120; // px — usable bar area height

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-[20px] border border-sand-dark/50 shadow-luxury p-5">
      <p className="text-sm font-serif font-bold text-slate-900 mb-6 tracking-tight">Receita — últimos 3 meses</p>

      <div className="relative">
        {/* Horizontal guide lines */}
        <div className="absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between pointer-events-none">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="border-t border-dashed border-gray-100 w-full" />
          ))}
        </div>

        {/* Bars */}
        <div className="flex items-end justify-around gap-2 pb-6 relative" style={{ height: BAR_H + 40 }}>
          {data.map((point, idx) => {
            const expPct = maxValue > 0 ? (point.expected / maxValue) * BAR_H : 0;
            const recPct = maxValue > 0 ? (point.received / maxValue) * BAR_H : 0;

            return (
              <div key={idx} className="flex flex-col items-center gap-1 flex-1">
                {/* Value labels above bars */}
                <div className="flex gap-1 items-end mb-1">
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[10px] text-slate-400 font-medium leading-none">
                      {formatK(point.expected)}
                    </span>
                    <div
                      className="w-5 bg-sand-dark rounded-t-md transition-all"
                      style={{ height: Math.max(expPct, point.expected > 0 ? 4 : 0) }}
                    />
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[10px] text-gold-dark font-medium leading-none">
                      {formatK(point.received)}
                    </span>
                    <div
                      className="w-5 bg-gold rounded-t-md transition-all"
                      style={{ height: Math.max(recPct, point.received > 0 ? 4 : 0) }}
                    />
                  </div>
                </div>

                {/* Month label */}
                <span className="text-xs text-gray-400 font-medium absolute bottom-0">
                  {point.monthLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-sand-dark shrink-0" />
          <span className="text-xs text-slate-500 font-medium">Previsto</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-gold shrink-0" />
          <span className="text-xs text-slate-500 font-medium">Recebido</span>
        </div>
      </div>
    </div>
  );
}
