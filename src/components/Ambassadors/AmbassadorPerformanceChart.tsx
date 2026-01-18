import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

interface AmbassadorPerformanceChartProps {
  monthlyData: Array<{
    month: string;
    points: number;
    tasks: number;
    reach: number;
  }>;
}

export function AmbassadorPerformanceChart({ monthlyData }: AmbassadorPerformanceChartProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Points Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Evolución de Puntos</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip
                formatter={(value) => [value, 'Puntos']}
                labelFormatter={(label) => `Mes: ${label}`}
              />
              <Line
                type="monotone"
                dataKey="points"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tasks & Reach */}
      <Card>
        <CardHeader>
          <CardTitle>Actividad Mensual</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip
                formatter={(value, name) => [value, name === 'tasks' ? 'Tareas' : 'Alcance']}
                labelFormatter={(label) => `Mes: ${label}`}
              />
              <Bar dataKey="tasks" fill="hsl(var(--primary))" name="tasks" />
              <Bar dataKey="reach" fill="hsl(var(--secondary))" name="reach" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
