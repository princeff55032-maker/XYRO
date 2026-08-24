"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function RevenueChart({
  data,
}: {
  data: { day: string; revenue: number }[];
}) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8B5E34" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#8B5E34" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#E5D9C5" vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="day"
            tick={{ fill: "#8C7A6B", fontSize: 10, fontWeight: 600 }}
            axisLine={{ stroke: "#E5D9C5" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#8C7A6B", fontSize: 10, fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
            width={50}
            tickFormatter={(v: number) => (v >= 1000 ? `₹${v / 1000}k` : `₹${v}`)}
          />
          <Tooltip
            contentStyle={{
              background: "#FFFFFF",
              border: "1px solid #E5D9C5",
              borderRadius: "12px",
              fontSize: "12px",
              padding: "10px 14px",
              boxShadow: "0 10px 30px rgba(51,40,30,0.1)",
            }}
            labelStyle={{ color: "#33281E", fontWeight: 800, marginBottom: "4px" }}
            itemStyle={{ color: "#8B5E34", fontWeight: 700 }}
            formatter={(v) => [`₹${Number(v).toLocaleString("en-IN")}`, "Daily Inflow"]}
            cursor={{ stroke: "#8B5E34", strokeWidth: 1.5 }}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#8B5E34"
            strokeWidth={2.5}
            fill="url(#revGrad)"
            activeDot={{ r: 5, fill: "#8B5E34", stroke: "#FFFFFF", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
