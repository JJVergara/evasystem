import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Instagram, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface InstagramConnectProps {
  type: "ambassador" | "organization";
  entityId: string;
  organizationId?: string;
  currentStatus?: {
    isConnected: boolean;
    username?: string;
    followerCount?: number;
    lastSync?: string;
  };
  onConnectionChange?: () => void;
}

export function InstagramConnect({ 
  type, 
  entityId, 
  organizationId,
  currentStatus = { isConnected: false },
  onConnectionChange 
}: InstagramConnectProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const { user } = useAuth();

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      
      // Use authenticated user ID instead of entityId
      const userId = user?.id || entityId;
      
      console.log('Initiating Instagram connection with production redirect URI');
      
      // Call the meta-oauth edge function with action as query parameter
      const { data, error } = await supabase.functions.invoke('meta-oauth?action=authorize', {
        body: {
          user_id: userId,
          organization_id: organizationId || entityId,
          type: type
          // redirect_base removed - always using production URL for Meta OAuth
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        let errorMessage = 'Error al conectar con Instagram';
        
        // More specific error handling
        if (error.message?.includes('credentials') || error.message?.includes('configuration_error')) {
          errorMessage = 'Credenciales de Meta no configuradas. Configura las credenciales de Meta App y asegúrate de que el redirect URI en Meta Developers sea: https://app.evasystem.cl/api/meta-oauth?action=callback';
        } else if (error.message?.includes('redirect_uri')) {
          errorMessage = 'URI de redirección no válida. Añade esta URL a Meta Developers: https://app.evasystem.cl/api/meta-oauth?action=callback';
        } else if (error.message?.includes('fetch')) {
          errorMessage = 'Error de conexión. Verifica tu conexión a internet.';
        } else if (error.message?.includes('cors')) {
          errorMessage = 'Error de configuración. Contacta al administrador.';
        }
        
        throw new Error(errorMessage);
      }

      if (data?.authUrl) {
        console.log('Redirecting to Meta OAuth:', data.authUrl);
        console.log('Using production redirect URI: https://app.evasystem.cl/api/meta-oauth?action=callback');
        // Redirect to Meta OAuth
        window.location.href = data.authUrl;
      } else {
        console.error('No authUrl in response:', data);
        if (data?.error_description) {
          throw new Error(data.error_description);
        }
        throw new Error('No se pudo generar la URL de autorización. Verifica la configuración de Meta.');
      }
    } catch (error) {
      console.error('Error connecting Instagram:', error);
      const message = error instanceof Error ? error.message : 'Error al conectar con Instagram';
      toast.error(message);
      setIsConnecting(false);
    }
  };

  if (currentStatus.isConnected) {
    return (
      <div className="flex items-center gap-2 p-3 border rounded-lg bg-green-50 dark:bg-green-900/20">
        <CheckCircle className="w-4 h-4 text-green-600" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Instagram className="w-4 h-4" />
            {currentStatus.username ? (
              <span className="font-medium">@{currentStatus.username}</span>
            ) : (
              <span className="font-medium">Cuenta conectada</span>
            )}
            {currentStatus.followerCount != null && (
              <Badge variant="secondary">
                {currentStatus.followerCount.toLocaleString()} seguidores
              </Badge>
            )}
          </div>
          {currentStatus.lastSync && (
            <p className="text-sm text-muted-foreground">
              Última sincronización: {new Date(currentStatus.lastSync).toLocaleDateString()}
            </p>
          )}
        </div>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={handleConnect}
          disabled={isConnecting}
        >
          {isConnecting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            "Reconectar"
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 p-3 border rounded-lg border-dashed">
      <AlertCircle className="w-4 h-4 text-orange-500" />
      <div className="flex-1">
        <p className="font-medium">Instagram no conectado</p>
        <p className="text-sm text-muted-foreground">
          {type === "ambassador" 
            ? "Conecta tu cuenta de Instagram para sincronizar datos automáticamente"
            : "Conecta tu cuenta business de Instagram para gestionar contenido"
          }
        </p>
      </div>
      <Button 
        onClick={handleConnect}
        disabled={isConnecting}
        className="gap-2"
      >
        {isConnecting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Instagram className="w-4 h-4" />
        )}
        {isConnecting ? "Conectando..." : "Conectar Instagram"}
      </Button>
    </div>
  );
}