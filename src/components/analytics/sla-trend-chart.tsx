"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ChartGrid, ChartTooltip, ChartGradient, axisProps, useChartTokens } from "./chart-primitives";

interface SlaWeek {
  week: string;
  total: number;
  compliant: number;
  breached: number;
  compliance: number;
}

interface Props {
  data: SlaWeek[];
}

export function SlaTrendChart({ data }: Props) {
  const t = useChartTokens();
  const axis = axisProps();

  if (!data.length) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-400">
        Sin datos suficientes (se requieren tickets con SLA en las últimas 12 semanas)
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 8, right: 36, left: 0, bottom: 4 }}>
        <defs>
          <ChartGradient id="sla-compliant" color="#22c55e" startOpacity={0.55} />
          <ChartGradient id="sla-breached" color="#ef4444" startOpacity={0.55} />
        </defs>
        <ChartGrid />
        <XAxis dataKey="week" {...axis} />
        <YAxis yAxisId="left" {...axis} allowDecimals={false} />
        <YAxis yAxisId="right" orientation="right" unit="%" domain={[0, 100]} {...axis} />
        <ChartTooltip
          titlePrefix="Semana"
          formatValue={(row) => (row.dataKey === "compliance" ? `${row.value}%` : String(row.value))}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
          formatter={(value) => <span style={{ color: t.text }}>{value}</span>}
        />
        <Bar
          yAxisId="left"
          dataKey="compliant"
          name="Cumplidos"
          stackId="a"
          fill="url(#sla-compliant)"
          radius={[0, 0, 0, 0]}
        />
        <Bar
          yAxisId="left"
          dataKey="breached"
          name="Incumplidos"
          stackId="a"
          fill="url(#sla-breached)"
          radius={[3, 3, 0, 0]}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="compliance"
          name="Cumplimiento %"
          stroke="#0099f2"
          strokeWidth={2.5}
          dot={{ r: 3, fill: "#0099f2", strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
