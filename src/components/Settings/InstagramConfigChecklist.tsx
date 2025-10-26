import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle, 
  AlertCircle, 
  ExternalLink,
  Settings,
  Link2,
  Users,
  Info
} from "lucide-react";
import { useState, useEffect } from "react";
import { useCurrentOrganization } from "@/hooks/useCurrentOrganization";
import { useInstagramConnection } from "@/hooks/useInstagramConnection";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface InstagramConfigChecklistProps {
  onOpenCredentials?: () => void;
}

export function InstagramConfigChecklist({ onOpenCredentials }: InstagramConfigChecklistProps) {
  const { organization } = useCurrentOrganization();
  const { isConnected } = useInstagramConnection();
  const [hasCredentials, setHasCredentials] = useState(false);
  
  // Safe data access
  const instagramUsername = organization?.instagram_username || null;
  
  const currentDomain = window.location.origin;
  const redirectUri = `${currentDomain}/api/meta-oauth?action=callback`;

  useEffect(() => {
    if (organization) {
      checkCredentialsStatus();
    }
  }, [organization]);

  const checkCredentialsStatus = async () => {
    if (!organization?.id) return;

    try {
      const { data, error } = await supabase.rpc('get_org_meta_credentials_status', {
        p_organization_id: organization.id
      });

      if (error) {
        console.error('Error checking credentials status:', error);
        // Show only unexpected server errors, not permission issues
        if (!error.message?.includes('permission') && !error.message?.includes('unauthorized')) {
          toast.error('Error al verificar credenciales', {
            description: 'Error del servidor al verificar credenciales'
          });
        }
        setHasCredentials(false);
        return;
      }

      if (data && data.length > 0) {
        setHasCredentials(data[0].has_credentials || false);
      } else {
        setHasCredentials(false);
      }
    } catch (error) {
      console.error('Error checking credentials status:', error);
      setHasCredentials(false);
      // Only show toast for unexpected errors
      toast.error('Error de conexión', {
        description: 'No se pudo conectar con el servidor'
      });
    }
  };
  
  const getCheckStatus = (condition: boolean) => {
    return condition ? (
      <CheckCircle className="h-4 w-4 text-success" />
    ) : (
      <AlertCircle className="h-4 w-4 text-destructive" />
    );
  };

  const checklist = [
    {
      title: "Credenciales de Meta App",
      description: "App ID, App Secret y Webhook Verify Token",
      status: hasCredentials,
      action: hasCredentials ? "Verificar credenciales" : "Configurar credenciales",
      link: hasCredentials ? "https://developers.facebook.com/apps" : undefined,
      onClick: hasCredentials ? undefined : onOpenCredentials
    },
    {
      title: "URL de Redirección OAuth",
      description: `Agregar ${redirectUri} a las URIs válidas`,
      status: !!instagramUsername,
      action: "Configurar en Meta Developer Console",
      link: "https://developers.facebook.com/apps"
    },
    {
      title: "Webhook Configurado", 
      description: "URL del webhook y token de verificación",
      status: false, // We'll check this via webhook status later
      action: "Configurar webhook endpoint",
      link: "https://developers.facebook.com/apps"
    },
    {
      title: "Suscripciones de Instagram",
      description: "Eventos: mentions, story_insights, live_comments",
      status: false,
      action: "Activar suscripciones",
      link: "https://developers.facebook.com/apps"
    },
    {
      title: "Usuario como Tester",
      description: "Tu cuenta debe estar en la lista de testers",
      status: !!instagramUsername,
      action: "Agregar en App Roles",
      link: "https://developers.facebook.com/apps"
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configuración Meta Developer App
        </CardTitle>
        <CardDescription>
          Verifica que tu app de Meta esté configurada correctamente para la integración
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Domain Info */}
        <div className="p-3 bg-muted rounded-md">
          <div className="flex items-center gap-2 mb-2">
            <Link2 className="h-4 w-4" />
            <span className="font-medium text-sm">Dominio Actual</span>
          </div>
          <code className="text-sm bg-background px-2 py-1 rounded border break-all">
            {currentDomain}
          </code>
        </div>

        <Separator />

        {/* Checklist Items */}
        <div className="space-y-3">
          {checklist.map((item, index) => (
            <div key={index} className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 p-3 border rounded-md">
              <div className="flex items-start gap-3 flex-1">
                {getCheckStatus(item.status)}
                <div className="space-y-1 break-words">
                  <div className="font-medium text-sm">{item.title}</div>
                  <div className="text-sm text-muted-foreground break-words">{item.description}</div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto shrink-0"
                onClick={() => {
                  if (item.onClick) {
                    item.onClick();
                  } else if (item.link) {
                    window.open(item.link, '_blank');
                  }
                }}
              >
                {item.link && <ExternalLink className="h-3 w-3 mr-1" />}
                {!item.link && <Settings className="h-3 w-3 mr-1" />}
                <span className="truncate">{item.action}</span>
              </Button>
            </div>
          ))}
        </div>

        <Separator />

        {/* Webhook URL Info */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            <span className="font-medium text-sm">URL del Webhook</span>
          </div>
          <code className="block text-sm bg-background px-3 py-2 rounded border break-all">
            {currentDomain}/api/meta-oauth?action=webhook
          </code>
        </div>

        {/* Important Notes */}
        <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-md">
          <Info className="h-4 w-4 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">Notas Importantes</p>
            <ul className="space-y-1 text-sm">
              <li>• La app debe estar en modo "Desarrollo" para testing</li>
              <li>• Agrega tu cuenta de Instagram como tester</li>
              <li>• Vincular una página de Facebook con cuenta business de Instagram</li>
              <li>• Los permisos requeridos: instagram_basic, pages_show_list, pages_read_engagement</li>
            </ul>
          </div>
        </div>

        {/* Connection Status */}
        {isConnected && (
          <div className="p-3 bg-green-50 rounded-md">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="font-medium text-sm text-green-800">Instagram Conectado</span>
            </div>
            <div className="text-sm text-green-700">
              {instagramUsername && (
                <div>Usuario: @{instagramUsername}</div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}