import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

interface MonthlyData {
  month: string;
  events: number;
  tasks: number;
  reach: number;
  ambassadors: number;
}

interface OrganizationPerformanceChartProps {
  monthlyData: MonthlyData[];
}

export function OrganizationPerformanceChart({ monthlyData }: OrganizationPerformanceChartProps) {
  const chartConfig = {
    events: {
      label: 'Eventos',
      color: 'hsl(var(--primary))',
    },
    tasks: {
      label: 'Tareas',
      color: 'hsl(var(--secondary))',
    },
    reach: {
      label: 'Alcance',
      color: 'hsl(var(--accent))',
    },
    ambassadors: {
      label: 'Embajadores',
      color: 'hsl(var(--muted-foreground))',
    },
  };

  const formatReachData = monthlyData.map((item) => ({
    ...item,
    reachFormatted:
      item.reach > 1000 ? `${(item.reach / 1000).toFixed(1)}K` : item.reach.toString(),
  }));

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Actividad Mensual</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="events" fill="var(--color-events)" name="Eventos" />
                <Bar dataKey="tasks" fill="var(--color-tasks)" name="Tareas" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Crecimiento y Alcance</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <ChartTooltip
                  content={<ChartTooltipContent />}
                  formatter={(value, name) => {
                    if (name === 'Alcance') {
                      const numValue = Number(value);
                      return numValue > 1000 ? `${(numValue / 1000).toFixed(1)}K` : value;
                    }
                    return value;
                  }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="reach"
                  stroke="var(--color-reach)"
                  name="Alcance"
                  strokeWidth={2}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="ambassadors"
                  stroke="var(--color-ambassadors)"
                  name="Embajadores Activos"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
