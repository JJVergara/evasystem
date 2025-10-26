import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useMentionsManagement } from "@/hooks/useMentionsManagement";
import { useCurrentOrganization } from "@/hooks/useCurrentOrganization";

export function MentionsManagement() {
  const { mentions, stats, loading, error } = useMentionsManagement();
  const { organization } = useCurrentOrganization();
  const [isManualSync, setIsManualSync] = useState(false);

  const handleManualSync = async () => {
    if (!organization) {
      toast.error("No hay organización seleccionada");
      return;
    }

    setIsManualSync(true);
    try {
      const { data, error } = await supabase.functions.invoke('instagram-sync', {
        body: { organization_id: organization.id }
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        toast.success(`Sincronización completada: ${data.totalProcessed} organizaciones procesadas`);
        // The real-time hook should automatically refresh the data
      } else {
        toast.error("Error en la sincronización");
      }
    } catch (error: any) {
      console.error('Sync error:', error);
      toast.error(`Error: ${error.message || 'Error desconocido'}`);
    } finally {
      setIsManualSync(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-4 bg-white/50 rounded-lg">
              <Skeleton className="h-16 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Menciones y Tags</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Selecciona una organización para ver las menciones de Instagram
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats and Manual Sync */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Menciones</p>
                <p className="text-2xl font-bold">{stats.total.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Alcance Total</p>
                <p className="text-2xl font-bold">
                  {stats.reach > 1000 ? 
                    `${(stats.reach / 1000).toFixed(1)}K` : 
                    stats.reach.toLocaleString()
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sin Asignar</p>
                <p className="text-2xl font-bold">{stats.unassigned}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sincronización</p>
                <Button 
                  onClick={handleManualSync} 
                  disabled={isManualSync}
                  size="sm"
                  className="mt-1"
                >
                  {isManualSync ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Sincronizando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Sincronizar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mentions List */}
      <Card>
        <CardHeader>
          <CardTitle>Menciones Recientes de Instagram</CardTitle>
        </CardHeader>
        <CardContent>
          {mentions.length > 0 ? (
            <div className="space-y-4">
              {mentions.map((mention) => (
                <div key={mention.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium text-sm">
                          {mention.ambassador_name ? 
                            mention.ambassador_name.split(' ').map(n => n[0]).join('') :
                            mention.instagram_username.substring(0, 2).toUpperCase()
                          }
                        </span>
                      </div>
                      <div>
                        <h4 className="font-medium">
                          {mention.ambassador_name || `@${mention.instagram_username}`}
                        </h4>  
                        <p className="text-sm text-muted-foreground">@{mention.instagram_username}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        mention.mention_type === 'mention' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {mention.mention_type === 'mention' ? 'Mención' : 'Tag'}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        mention.processed 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {mention.processed ? 'Procesada' : 'Pendiente'}
                      </span>
                    </div>
                  </div>
                  
                  {mention.content && (
                    <p className="text-sm mb-3 bg-muted p-3 rounded-lg">
                      {mention.content}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center space-x-4">
                      <span>Alcance: {mention.reach_count.toLocaleString()}</span>
                      <span>Engagement: {mention.engagement_score}%</span>
                    </div>
                    <span>{new Date(mention.created_at).toLocaleDateString('es-ES')}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p className="mb-4">No hay menciones registradas aún</p>
              <p className="text-sm mb-4">
                Haz clic en "Sincronizar" para buscar nuevas menciones de Instagram
              </p>
              <Button 
                onClick={handleManualSync} 
                disabled={isManualSync}
                variant="outline"
              >
                {isManualSync ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Sincronizar Ahora
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}