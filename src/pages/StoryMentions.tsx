import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertCircle, BookOpen, Play } from "lucide-react";
import { StoryMentionsList } from "@/components/StoryMentions/StoryMentionsList";
import { StoryMentionDetails } from "@/components/StoryMentions/StoryMentionDetails";
import { useStoryMentions } from "@/hooks/useStoryMentions";
import { useCurrentOrganization } from "@/hooks/useCurrentOrganization";
import { useToast } from "@/hooks/use-toast";
import { StoryMention } from "@/types/storyMentions";
import { supabase } from "@/integrations/supabase/client";

export default function StoryMentions() {
  const [selectedMention, setSelectedMention] = useState<StoryMention | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [runningWorker, setRunningWorker] = useState(false);
  
  const { organization } = useCurrentOrganization();
  const { mentions, loading, error, fetchStoryMentions, markAsProcessed, flagAsEarlyDelete, sendReply } = useStoryMentions();
  const { toast } = useToast();

  const handleViewDetails = (mention: StoryMention) => {
    setSelectedMention(mention);
    setDetailsOpen(true);
  };

  const handleMarkAsProcessed = async (mentionId: string) => {
    try {
      await markAsProcessed(mentionId);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleFlagAsEarlyDelete = async (mentionId: string) => {
    try {
      await flagAsEarlyDelete(mentionId);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleReply = async (mention: StoryMention, message?: string) => {
    if (message) {
      // Reply from details modal
      try {
        await sendReply(mention, message);
      } catch (error) {
        // Error handling is done in the hook
      }
    } else {
      // Show details modal to compose reply
      setSelectedMention(mention);
      setDetailsOpen(true);
    }
  };

  const handleCreateLead = (mention: StoryMention) => {
    // Placeholder for CRM integration
    toast({
      title: "Función en desarrollo",
      description: "La integración con CRM estará disponible próximamente",
      variant: "default"
    });
  };

  const handleRefresh = () => {
    fetchStoryMentions();
    toast({
      title: "Actualizando",
      description: "Buscando nuevas menciones de historias..."
    });
  };

  const handleRunWorker = async () => {
    setRunningWorker(true);
    try {
      const { data, error } = await supabase.functions.invoke('story-mentions-state-worker');
      
      if (error) {
        throw error;
      }

      toast({
        title: "Worker ejecutado",
        description: `Procesadas: ${data.processed || 0} menciones, Notificaciones: ${data.notifications_sent || 0}`
      });

      // Refresh the mentions list
      fetchStoryMentions();
    } catch (error) {
      console.error('Error running worker:', error);
      toast({
        title: "Error",
        description: "No se pudo ejecutar el worker de estados",
        variant: "destructive"
      });
    } finally {
      setRunningWorker(false);
    }
  };

  if (!organization) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Selecciona una organización para ver las menciones de historias</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Menciones de Historias</h1>
            <p className="text-muted-foreground">
              Gestiona las menciones provenientes de historias de Instagram
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                // First, try to resolve story mentions
                try {
                  const { data: resolveData, error: resolveError } = await supabase.functions.invoke('resolve-story-mentions', {
                    body: {
                      organizationId: organization.id
                    }
                  });

                  if (resolveError) {
                    console.error('Error resolving story mentions:', resolveError);
                  } else {
                    console.log('Story mentions resolved:', resolveData);
                  }
                } catch (error) {
                  console.error('Error calling resolve function:', error);
                }

                // Then run the state worker
                handleRunWorker();
              }}
              disabled={runningWorker}
              className="flex items-center gap-2"
            >
              <Play className={`w-4 h-4 ${runningWorker ? 'animate-spin' : ''}`} />
              {runningWorker ? "Ejecutando..." : "Resolver y Verificar"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </div>

        {/* Info Card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              ¿Qué son las menciones de historias?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Las menciones de historias ocurren cuando alguien te menciona en su historia de Instagram 
              y un usuario hace clic en la mención, siendo redirigido a un mensaje directo contigo. 
              Estas interacciones representan alto valor de engagement y oportunidades de negocio.
              <br /><br />
              <strong>Estados:</strong> Nueva (primeras 24h), Completada (expiró naturalmente), 
              Borrada temprano (marcada manualmente si se elimina antes de las 24h).
            </CardDescription>
          </CardContent>
        </Card>

        {/* Error State */}
        {error && (
          <Card className="border-destructive/50 bg-destructive/10">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-5 h-5" />
                <p>Error al cargar las menciones: {error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <StoryMentionsList
          mentions={mentions}
          loading={loading}
          onViewDetails={handleViewDetails}
          onMarkAsProcessed={handleMarkAsProcessed}
          onFlagAsEarlyDelete={handleFlagAsEarlyDelete}
          onReply={handleReply}
          onCreateLead={handleCreateLead}
        />

        {/* Details Modal */}
        <StoryMentionDetails
          mention={selectedMention}
          open={detailsOpen}
          onClose={() => {
            setDetailsOpen(false);
            setSelectedMention(null);
          }}
          onMarkAsProcessed={handleMarkAsProcessed}
          onFlagAsEarlyDelete={handleFlagAsEarlyDelete}
          onReply={async (mention, message) => {
            await sendReply(mention, message);
          }}
          onCreateLead={handleCreateLead}
        />
    </div>
  );
}
