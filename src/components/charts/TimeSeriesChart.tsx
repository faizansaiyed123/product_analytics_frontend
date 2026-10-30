import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartType, TrendResult } from "@/types";
import { bucketLabel, fmtCompact, fmtNum } from "@/utils/format";
import { Table, Td, Th } from "../ui/misc";
import { SERIES_COLORS } from "./palette";

export function toRows(r: TrendResult, includePrevious = true) {
  return r.labels.map((label, i) => {
    const row: Record<string, string | number | null> = { label };
    r.series.forEach((s, si) => {
      row[`s${si}`] = s.data[i] ?? null;
      if (includePrevious && r.previous?.series[si]) row[`p${si}`] = r.previous.series[si].data[i] ?? null;
    });
    return row;
  });
}

export function TimeSeriesChart({
  result,
  chart,
  height = 288,
}: {
  result: TrendResult;
  chart: ChartType;
  height?: number;
}) {
  if (chart === "table") return <SeriesTable result={result} />;
  const rows = toRows(result);
  const hasPrev = !!result.previous;
  const common = { data: rows, margin: { top: 8, right: 12, left: 0, bottom: 0 } };
  const axes = (
    <>
      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
      <XAxis
        dataKey="label"
        tickFormatter={(v) => bucketLabel(String(v), result.interval)}
        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
        tickLine={false}
        axisLine={{ stroke: "hsl(var(--border))" }}
        minTickGap={24}
      />
      <YAxis
        tickFormatter={(v) => fmtCompact(Number(v))}
        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
        tickLine={false}
        axisLine={false}
        width={44}
        allowDecimals
      />
      <Tooltip
        contentStyle={{
          background: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
          borderRadius: 6,
          fontSize: 12,
        }}
        formatter={(v: number) => fmtNum(v, 2)}
        labelFormatter={(l) => String(l)}
      />
      {(result.series.length > 1 || hasPrev) && <Legend wrapperStyle={{ fontSize: 12 }} />}
    </>
  );
  const name = (i: number) => result.series[i].label;
  return (
    <div style={{ height }} role="img" aria-label={`${chart} chart of ${result.series.map((s) => s.label).join(", ")}`}>
      <ResponsiveContainer width="100%" height="100%">
        {chart === "bar" ? (
          <BarChart {...common}>
            {axes}
            {result.series.map((_, i) => (
              <Bar
                key={i}
                dataKey={`s${i}`}
                name={name(i)}
                fill={SERIES_COLORS[i % 10]}
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        ) : chart === "area" ? (
          <AreaChart {...common}>
            {axes}
            {result.series.map((_, i) => (
              <Area
                key={i}
                type="monotone"
                dataKey={`s${i}`}
                name={name(i)}
                stroke={SERIES_COLORS[i % 10]}
                fill={SERIES_COLORS[i % 10]}
                fillOpacity={0.15}
                strokeWidth={2}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        ) : (
          <LineChart {...common}>
            {axes}
            {result.series.map((_, i) => (
              <Line
                key={i}
                type="monotone"
                dataKey={`s${i}`}
                name={name(i)}
                stroke={SERIES_COLORS[i % 10]}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            ))}
            {hasPrev &&
              result.series.map((_, i) => (
                <Line
                  key={`p${i}`}
                  type="monotone"
                  dataKey={`p${i}`}
                  name={`${name(i)} (previous)`}
                  stroke={SERIES_COLORS[i % 10]}
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                  opacity={0.6}
                  isAnimationActive={false}
                />
              ))}
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

export function SeriesTable({ result }: { result: TrendResult }) {
  return (
    <Table className="max-h-80 overflow-y-auto">
      <thead className="sticky top-0 bg-card">
        <tr>
          <Th>{result.kind === "distribution" ? "Times performed" : "Date"}</Th>
          {result.series.map((s, i) => (
            <Th key={i} className="text-right">
              {s.label}
            </Th>
          ))}
        </tr>
      </thead>
      <tbody>
        {result.labels.map((l, i) => (
          <tr key={l}>
            <Td className="tabular">{l}</Td>
            {result.series.map((s, si) => (
              <Td key={si} className="tabular text-right">
                {fmtNum(s.data[i], 2)}
              </Td>
            ))}
          </tr>
        ))}
        <tr className="font-medium">
          <Td>Total</Td>
          {result.series.map((s, i) => (
            <Td key={i} className="tabular text-right">
              {fmtNum(s.total, 2)}
            </Td>
          ))}
        </tr>
      </tbody>
    </Table>
  );
}

export function DistributionChart({ result, height = 260 }: { result: TrendResult; height?: number }) {
  const rows = result.labels.map((l, i) => ({
    label: l,
    ...Object.fromEntries(result.series.map((s, si) => [`s${si}`, s.data[i]])),
  }));
  return (
    <div style={{ height }} role="img" aria-label="Distribution of users by number of times the event was performed">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            label={{ value: "times performed", position: "insideBottom", offset: -2, fontSize: 11 }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 6,
              fontSize: 12,
            }}
          />
          {result.series.map((_, i) => (
            <Bar
              key={i}
              dataKey={`s${i}`}
              name={result.series[i].label + " (users)"}
              fill={SERIES_COLORS[i % 10]}
              radius={[3, 3, 0, 0]}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
