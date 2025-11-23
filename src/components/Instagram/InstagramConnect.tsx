import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Instagram, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface InstagramConnectProps {
  type: "ambassador" | "organization";
  /** For ambassadors: ambassador.id. For org: organization.id */
  entityId: string;
  /** Optional explicit org id; if not provided, we’ll fall back to entityId for org flow */
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
  onConnectionChange,
}: InstagramConnectProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const { user } = useAuth();

  const handleConnect = async () => {
    try {
      setIsConnecting(true);

      if (!user) {
        toast.error("Debes iniciar sesión para conectar Instagram");
        return;
      }

      // Determine which organization we’re acting on
      const orgId = organizationId ?? (type === "organization" ? entityId : undefined);
      if (!orgId) {
        toast.error("No se encontró la organización asociada");
        return;
      }

      // Build body according to the new edge function contract
      const body: any = {
        type,
        organization_id: orgId,
        // If you ever want a custom UI redirect after success:
        // redirect_base: "https://app.evasystem.cl/ambassadors",
      };

      if (type === "ambassador") {
        body.ambassador_id = entityId;
      }

      console.log("Initiating Instagram connection", {
        type,
        orgId,
        ambassador_id: body.ambassador_id,
      });

      const { data, error } = await supabase.functions.invoke(
        "meta-oauth?action=authorize",
        { body }
      );

      if (error) {
        console.error("Supabase function error:", error);
        let errorMessage = "Error al conectar con Instagram";

        if (error.message?.includes("configuration_error") || error.message?.includes("credentials")) {
          errorMessage =
            "Credenciales de Meta no configuradas. Asegúrate de configurar la app de Meta y el redirect URI: https://app.evasystem.cl/api/meta-oauth?action=callback";
        } else if (error.message?.includes("redirect_uri")) {
          errorMessage =
            "URI de redirección no válida. Añade esta URL en Meta Developers: https://app.evasystem.cl/api/meta-oauth?action=callback";
        } else if (error.message?.toLowerCase().includes("forbidden")) {
          errorMessage =
            "No tienes permisos para conectar esta organización. Verifica que seas miembro activo.";
        }

        throw new Error(errorMessage);
      }

      if (data?.authUrl) {
        console.log("Redirecting to Instagram OAuth:", data.authUrl);
        window.location.href = data.authUrl;
      } else {
        console.error("No authUrl in response:", data);
        const msg =
          data?.error_description ||
          "No se pudo generar la URL de autorización. Verifica la configuración de Meta.";
        throw new Error(msg);
      }
    } catch (err) {
      console.error("Error connecting Instagram:", err);
      const message = err instanceof Error ? err.message : "Error al conectar con Instagram";
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
              Última sincronización:{" "}
              {new Date(currentStatus.lastSync).toLocaleDateString()}
            </p>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={handleConnect} disabled={isConnecting}>
          {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reconectar"}
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
            ? "Conecta la cuenta de Instagram del embajador para sincronizar datos automáticamente."
            : "Conecta la cuenta business de Instagram de la organización para gestionar contenido."}
        </p>
      </div>
      <Button onClick={handleConnect} disabled={isConnecting} className="gap-2">
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
