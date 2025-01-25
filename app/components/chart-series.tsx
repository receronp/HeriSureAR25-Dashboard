import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "./ui/chart";

export function ChartSeries({
  chartData,
  chartConfig,
}: {
  chartData: any;
  chartConfig: ChartConfig;
}) {
  const areaComponents = Object.entries(chartConfig).map(([id, { label }]) => {
    const safeName = typeof label === "string" ? label : ""; // Type guard
    return (
      <Area
        key={id}
        dataKey={id}
        name={safeName}
        type="linear"
        connectNulls={true}
        fill={`url(#fill${safeName.replace(/\s/g, "")})`}
        stroke={`var(--color-${id})`} // Dynamic stroke color
      />
    );
  });

  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto h-[250px] w-full"
    >
      <AreaChart data={chartData}>
        <defs>
          {/* Dynamically create linear gradients */}
          {Object.entries(chartConfig).map(([id, { label, color }]) => {
            const safeLabel = typeof label === "string" ? label : ""; // Type guard
            return (
              <linearGradient
                key={id}
                id={`fill${safeLabel.replace(/\s/g, "")}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                <stop offset="95%" stopColor={color} stopOpacity={0.1} />
              </linearGradient>
            );
          })}
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={true}
          axisLine={true}
          tickMargin={8}
          minTickGap={32}
          tickFormatter={(value) => {
            const date = new Date(value);
            return date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "numeric",
            });
          }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickCount={3}
          domain={["auto", "auto"]}
        />
        <ChartTooltip
          cursor={true}
          content={
            <ChartTooltipContent
              labelFormatter={(value) => {
                if (!value) return "Invalid date";
                return new Date(value).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "numeric",
                });
              }}
              indicator="dot"
            />
          }
        />
        {areaComponents}
        <ChartLegend content={<ChartLegendContent />} />
      </AreaChart>
    </ChartContainer>
  );
}
