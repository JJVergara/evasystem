import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PartyPopper,
  Users,
  Trophy,
  Target,
  TrendingUp,
  Calendar,
  Download,
  Filter
} from "lucide-react";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useFiestas } from "@/hooks/useFiestas";
import { FiestaSelector } from "./FiestaSelector";
import { FiestaMetricsCard } from "./FiestaMetricsCard";
import { MetricCard } from "./MetricCard";

export default function EnhancedDashboardContent() {
  const { profile, loading: profileLoading } = useUserProfile();
  const { fiestas, loading: fiestasLoading } = useFiestas();

  const handleExportReport = () => {
    console.log('Exportar reporte general');
  };

  // Show loading skeleton while data is being fetched
  if (fiestasLoading || profileLoading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded" />
                <Skeleton className="h-8 w-48" />
              </div>
              <Skeleton className="h-5 w-64 mt-2" />
            </div>
            <Skeleton className="h-10 w-36" />
          </div>
        </div>

        {/* Fiestas section skeleton */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-6 rounded" />
            <Skeleton className="h-6 w-32" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="shadow-card">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-8 w-1/2" />
                    <div className="grid grid-cols-3 gap-2">
                      <Skeleton className="h-12 rounded" />
                      <Skeleton className="h-12 rounded" />
                      <Skeleton className="h-12 rounded" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <PartyPopper className="h-8 w-8 text-primary" />
              Dashboard de Fiestas
            </h1>
            <p className="text-lg text-muted-foreground">
              ¡Bienvenido, {profile?.name || 'Usuario'}! Gestiona las métricas de tus eventos
            </p>
          </div>
          <Button onClick={handleExportReport} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar Reporte
          </Button>
        </div>
      </div>

      {/* Fiesta Cards Grid */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <Calendar className="h-6 w-6 text-primary" />
          Tus Fiestas
        </h2>
        
        {fiestas.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {fiestas.map((fiesta) => (
              <FiestaMetricsCard key={fiesta.id} fiesta={fiesta} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <PartyPopper className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">¡No hay fiestas aún!</h3>
              <p className="text-muted-foreground text-center mb-4">
                Crea tu primera fiesta para empezar a gestionar embajadores y eventos.
              </p>
              <Button>
                Crear Primera Fiesta
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Stats */}
      {fiestas.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Estadísticas Generales</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total Fiestas"
              value={fiestas.length.toString()}
              icon={<PartyPopper className="h-4 w-4" />}
              description="Fiestas creadas"
            />
            <MetricCard
              title="Fiestas Activas"
              value={fiestas.filter(f => f.status === 'active').length.toString()}
              icon={<Trophy className="h-4 w-4" />}
              description="En progreso actualmente"
            />
            <MetricCard
              title="Próximas Fiestas"
              value={fiestas.filter(f => f.event_date && new Date(f.event_date) > new Date()).length.toString()}
              icon={<Calendar className="h-4 w-4" />}
              description="Programadas a futuro"
            />
            <MetricCard
              title="Completadas"
              value={fiestas.filter(f => f.status === 'completed').length.toString()}
              icon={<Target className="h-4 w-4" />}
              description="Finalizadas exitosamente"
            />
          </div>
        </div>
      )}
    </div>
  );
}