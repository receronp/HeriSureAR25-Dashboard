import { useEffect, useMemo, useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { ChartSeries } from "~/components/chart-series";
import { LogView } from "~/components/log-view";
import { ModeToggle } from "~/components/mode-toggle";
import { ChartContainer, type ChartConfig } from "~/components/ui/chart";
import {
  Label as RechartsLabel,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
} from "recharts";
import { Progress } from "~/components/ui/progress";
import { Slider } from "~/components/ui/slider";
import { Input } from "~/components/ui/input";
import { Switch } from "~/components/ui/switch";
import { Label } from "~/components/ui/label";

const TIME_RANGES = {
  "30d": { label: "Last 1 month", value: 30 * 24 },
  "7d": { label: "Last 7 days", value: 7 * 24 },
  "1d": { label: "Last 1 day", value: 24 },
  "6h": { label: "Last 6 hours", value: 6 },
  "3h": { label: "Last 3 hours", value: 3 },
  "1h": { label: "Last hour", value: 1 },
  "30m": { label: "Last 30 minutes", value: 0.5 },
} as const;

const chartConfig: ChartConfig = {
  "eui-a84041e8f18646dc": {
    label: "Dragino",
    color: "hsl(var(--chart-2))",
  },
  "eui-ac1f09fffe171756": {
    label: "RAK3712",
    color: "hsl(var(--chart-1))",
  },
  "eui-24e124785d441512": {
    label: "Milesight",
    color: "hsl(var(--chart-3))",
  },
};

const DEVICE_IDS = Object.keys(chartConfig);

export function Dashboard() {
  const [alertSent, setAlertSent] = useState(false);
  const [overTemperature, setOverTemperature] = useState(false);
  const [maxTemperature, setMaxTemperature] = useState(30);
  const [timeRange, setTimeRange] = useState("1d" as keyof typeof TIME_RANGES);
  const [dashboardData, setDashboardData] = useState<any[]>([]);
  const [timeUntilRefresh, setTimeUntilRefresh] = useState(60);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const hasLocalStorage =
      typeof window !== "undefined" && !!window.localStorage;

    const initializeState = () => {
      if (hasLocalStorage) {
        const storedMaxTemperature = localStorage.getItem("maxTemperature");
        return storedMaxTemperature ? parseInt(storedMaxTemperature, 10) : 30;
      }
      return 30;
    };

    setMaxTemperature(initializeState());
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const hoursToSubtract = TIME_RANGES[timeRange].value;
      const startDate = new Date(Date.now() - hoursToSubtract * 60 * 60 * 1000);

      try {
        const response = await fetch(
          `/api/logs?timeStart=${startDate.toISOString()}`
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setDashboardData(data);
      } catch (error: any) {
      } finally {
      }
    };

    const refreshInterval = 60 * 1000; // 1 minute refresh interval

    const startCountdown = () => {
      let secondsRemaining = refreshInterval / 1000;
      setTimeUntilRefresh(secondsRemaining);

      const countdownInterval = setInterval(() => {
        secondsRemaining--;
        setTimeUntilRefresh(secondsRemaining);

        if (secondsRemaining <= 0) {
          clearInterval(countdownInterval);

          fetchData().then(() => {
            startCountdown();
          });
        }
      }, 1000);

      intervalRef.current = countdownInterval;
    };

    fetchData();
    startCountdown();

    return () => clearInterval(intervalRef.current!);
  }, [timeRange]);

  const latestData = dashboardData.reduce(
    (acc: { [deviceId: string]: any }, curr: any) => {
      acc[curr.message.device_id] = curr.message;
      return acc;
    },
    {}
  );

  const sendData = async (fPort: number, command: number, value: number) => {
    try {
      const response = await fetch("/api/mqtt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fPort: fPort, command: command, value: value }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error: any) {
    } finally {
    }
  };

  useEffect(() => {
    let newOverTemperature = false;

    for (const [deviceId, deviceData] of Object.entries(latestData)) {
      if (deviceId === "eui-ac1f09fffe171756") {
        if (deviceData.temperature > maxTemperature  && !alertSent) {
          newOverTemperature = true;
          setAlertSent(true);
          sendData(1, 0, 1);
          break;
        }
      }
    }

    if (newOverTemperature !== overTemperature) {
      setOverTemperature(newOverTemperature);
    }
  }, [latestData, maxTemperature, alertSent]);

  const createChartData = (dataKey: "temperature" | "humidity") => {
    return dashboardData.map((item: any) => {
      const deviceId = item.message.device_id;
      return {
        date: item.message.received_at,
        [deviceId]: item.message[dataKey],
      };
    });
  };

  const createLogData = useMemo(() => {
    return dashboardData.map((item: any) => ({
      id: item.id,
      device_id: item.message.device_id,
      application_id: item.message.application_id,
      received_at: item.message.received_at,
      temperature: item.message.temperature,
      humidity: item.message.humidity,
    }));
  }, [dashboardData]);

  const radialChart = (
    deviceId: string,
    dataKey: string,
    chartConfig: ChartConfig
  ) => {
    const value = latestData[deviceId]?.[dataKey] || 0;
    const color = chartConfig[deviceId]?.color || "gray";

    return (
      <RadialBarChart
        data={[{ name: dataKey, value: value }]}
        endAngle={180 - (dataKey === "humidity" ? 3.6 * value : 7.2 * value)}
        startAngle={180}
        innerRadius="70%"
        outerRadius="100%"
      >
        <RadialBar background dataKey="value" fill={color} />
        <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
          <RechartsLabel
            content={({ viewBox }) => {
              if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                return (
                  <text
                    x={viewBox.cx}
                    y={viewBox.cy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    <tspan
                      x={viewBox.cx}
                      y={viewBox.cy}
                      className="fill-foreground text-4xl font-bold"
                    >
                      {value}
                      {dataKey === "humidity" ? "%" : "°C"}
                    </tspan>
                    <tspan
                      x={viewBox.cx}
                      y={(viewBox.cy || 0) + 24}
                      className="text-xl fill-muted-foreground"
                    >
                      {dataKey.charAt(0).toUpperCase() + dataKey.slice(1)}
                    </tspan>
                  </text>
                );
              }
              return null;
            }}
          />
        </PolarRadiusAxis>
      </RadialBarChart>
    );
  };

  const renderDeviceCards = () =>
    DEVICE_IDS.map((deviceId) => (
      <Card key={deviceId}>
        <CardHeader>
          <CardTitle className="text-lg justify-between">
            {chartConfig[deviceId].label}
            <span className="text-sm text-muted-foreground">
              {` @ ${new Date(
                latestData[deviceId]?.["received_at"]
              ).toLocaleString()}`}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-between items-center gap-4 flex-wrap">
          <ChartContainer
            config={chartConfig}
            className="flex-grow aspect-square max-w-[250px] max-h-[250px]"
          >
            {radialChart(deviceId, "temperature", chartConfig)}
          </ChartContainer>

          <ChartContainer
            key={deviceId}
            config={chartConfig}
            className="flex-grow aspect-square max-w-[250px] max-h-[250px]"
          >
            {radialChart(deviceId, "humidity", chartConfig)}
          </ChartContainer>
        </CardContent>
      </Card>
    ));

  // Update max temperature when slider is moved
  const handleSliderChange = (value: number[]) => {
    const newTemperature = value[0];
    setMaxTemperature(newTemperature);
    if (typeof window !== "undefined") {
      // Only update localStorage if window is defined
      localStorage.setItem("maxTemperature", newTemperature.toString());
    }
  };

  // Update max temperature when input field is changed
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10);

    if (!isNaN(value)) {
      const newTemperature = Math.min(Math.max(value, 0), 35);
      setMaxTemperature(newTemperature);
      if (typeof window !== "undefined") {
        // Only update localStorage if window is defined
        localStorage.setItem("maxTemperature", newTemperature.toString());
      }
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">
            HeriSure IoT Dashboard
          </h2>
          <div className="flex items-center space-x-2">
            <Select
              value={timeRange}
              onValueChange={(value) =>
                setTimeRange(value as keyof typeof TIME_RANGES)
              }
            >
              <SelectTrigger
                className="w-[180px] rounded-lg sm:ml-auto"
                aria-label="Time Range"
              >
                <SelectValue placeholder={TIME_RANGES[timeRange].label} />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TIME_RANGES).map(([value, { label }]) => (
                  <SelectItem key={value} value={value} className="rounded-lg">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ModeToggle />
          </div>
        </div>
        <Tabs defaultValue="overview" className="space-y-4">
          <div className="flex justify-between items-center">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="logs">Logs</TabsTrigger>
            </TabsList>
            <div className="flex items-center space-x-4 ml-4">
              <h2 className="text-xl font-semibold">Set Max Temperature</h2>
              <Slider
                value={[maxTemperature]}
                onValueChange={handleSliderChange}
                min={0}
                max={35}
                step={1}
                className="w-32 lg:w-64"
              />
              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  value={maxTemperature}
                  onChange={handleInputChange}
                  className="w-20"
                />
                <span className="text-lg">°C</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="temperature-alert"
                onCheckedChange={(checked) => {
                  setMaxTemperature(30);
                  if (!checked) {
                    setAlertSent(false);
                    sendData(1, 0, 0);
                  }
                }}
                checked={overTemperature || alertSent}
              />
              <Label htmlFor="temperature-alert">
                Over-Temperature Indicator
              </Label>
            </div>
          </div>
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
              {renderDeviceCards()}
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-12">
              <Card className="col-span-2 lg:col-span-6">
                <CardHeader>
                  <CardTitle>Temperature</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                  <ChartSeries
                    chartData={createChartData("temperature")}
                    chartConfig={chartConfig}
                  />
                </CardContent>
              </Card>
              <Card className="col-span-2 lg:col-span-6">
                <CardHeader>
                  <CardTitle>Humidity</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                  <ChartSeries
                    chartData={createChartData("humidity")}
                    chartConfig={chartConfig}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>IoT Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <LogView data={createLogData} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            Next refresh in: {timeUntilRefresh} seconds
          </p>
          <Progress
            value={(timeUntilRefresh * 100) / 60}
            max={60}
            className="w-60 h-2 rounded-full bg-gray-200 dark:bg-gray-700"
          />
        </div>
      </div>
    </div>
  );
}
