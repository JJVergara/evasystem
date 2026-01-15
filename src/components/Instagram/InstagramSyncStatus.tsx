
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Zap, RefreshCw, CheckCircle, AlertTriangle } from "lucide-react";
import { useInstagramSync } from "@/hooks/useInstagramSync";
import { useCurrentOrganization } from "@/hooks/useCurrentOrganization";
import { supabase } from "@/integrations/supabase/client";

export function InstagramSyncStatus() {
  const { organization, loading: orgLoading } = useCurrentOrganization();
  const { isSyncing, syncInstagramData } = useInstagramSync();
  const [lastSync, setLastSync] = useState<string>('');
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [syncStats, setSyncStats] = useState({
    todayMentions: 0,
    todayTags: 0,
    weeklyMentions: 0,
    isAutoSyncActive: true
  });

  useEffect(() => {
    if (!organization?.id) return;

    // Load last sync time
    if (organization.last_instagram_sync) {
      setLastSync(organization.last_instagram_sync);
    }

    // Load today's stats
    loadSyncStats();
  }, [organization]);

  const loadSyncStats = async () => {
    if (!organization?.id) return;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      // Get today's mentions and tags
      const { data: todayData } = await supabase
        .from('social_mentions')
        .select('mention_type')
        .eq('organization_id', organization.id)
        .gte('created_at', today.toISOString());

      // Get weekly mentions
      const { data: weeklyData } = await supabase
        .from('social_mentions')
        .select('id')
        .eq('organization_id', organization.id)
        .gte('created_at', weekAgo.toISOString());

      const todayMentions = todayData?.filter(m => m.mention_type === 'mention').length || 0;
      const todayTags = todayData?.filter(m => m.mention_type === 'tag').length || 0;
      const weeklyMentions = weeklyData?.length || 0;

      setSyncStats({
        todayMentions,
        todayTags,
        weeklyMentions,
        isAutoSyncActive: true
      });
    } catch (error) {
      console.error('Error loading sync stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const handleManualSync = async () => {
    const success = await syncInstagramData();
    if (success) {
      loadSyncStats();
    }
  };

  const getTimeSinceLastSync = () => {
    if (!lastSync) return 'Nunca';
    
    const now = new Date();
    const syncTime = new Date(lastSync);
    const diffMinutes = Math.floor((now.getTime() - syncTime.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Hace menos de 1 minuto';
    if (diffMinutes < 60) return `Hace ${diffMinutes} minutos`;
    if (diffMinutes < 1440) return `Hace ${Math.floor(diffMinutes / 60)} horas`;
    return `Hace ${Math.floor(diffMinutes / 1440)} días`;
  };

  const getSyncStatusColor = () => {
    if (!lastSync) return 'destructive';
    
    const now = new Date();
    const syncTime = new Date(lastSync);
    const diffMinutes = Math.floor((now.getTime() - syncTime.getTime()) / (1000 * 60));
    
    if (diffMinutes <= 10) return 'success';
    if (diffMinutes <= 60) return 'default';
    return 'warning';
  };

  // Show loading skeleton while data is being fetched
  if (orgLoading || isLoadingStats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-6 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Estado de Sync</CardTitle>
          {syncStats.isAutoSyncActive ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={getSyncStatusColor()}>
              {syncStats.isAutoSyncActive ? 'Activo (cada 5 min)' : 'Inactivo'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Última sync: {getTimeSinceLastSync()}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Hoy</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {syncStats.todayMentions + syncStats.todayTags}
          </div>
          <p className="text-xs text-muted-foreground">
            {syncStats.todayMentions} menciones, {syncStats.todayTags} etiquetas
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Esta Semana</CardTitle>
          <Zap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{syncStats.weeklyMentions}</div>
          <p className="text-xs text-muted-foreground">
            Total de interacciones
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Sync Manual</CardTitle>
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleManualSync}
            disabled={isSyncing}
            size="sm"
            className="w-full"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Sincronizando...
              </>
            ) : (
              'Sincronizar Ahora'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
