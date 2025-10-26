
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, ExternalLink, Copy, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface InstagramConfigGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InstagramConfigGuide({ isOpen, onClose }: InstagramConfigGuideProps) {
  const redirectUri = `${window.location.origin}/api/meta-oauth?action=callback`;
  const webhookUrl = `https://awpfslcepylnipaolmvv.supabase.co/functions/v1/instagram-webhook`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado al portapapeles`);
  };

  const steps = [
    {
      title: "1. Crear App en Meta Developers",
      description: "Crea una nueva aplicación para tu organización",
      action: "Ir a Meta Developers",
      url: "https://developers.facebook.com/apps/",
      details: [
        "Haz clic en 'Crear app'",
        "Selecciona tipo 'Empresa' o 'Consumidor'",
        "Completa el nombre de tu app y email de contacto",
        "Guarda el App ID que se genera"
      ]
    },
    {
      title: "2. Configurar Productos",
      description: "Añade los productos necesarios para Instagram",
      details: [
        "Añadir 'Instagram Basic Display' (para cuentas personales)",
        "Añadir 'Instagram Graph API' (para cuentas business)",
        "Añadir 'Webhooks' para notificaciones en tiempo real"
      ]
    },
    {
      title: "3. Configurar Instagram Basic Display",
      description: "Configura el acceso básico a Instagram",
      details: [
        "Ve a Instagram Basic Display > Basic Display",
        "Añade la Redirect URI:",
        redirectUri,
        "Guarda los cambios"
      ]
    },
    {
      title: "4. Configurar Webhooks",
      description: "Configura las notificaciones automáticas",
      details: [
        "Ve a Webhooks en el menú lateral",
        "Crea un nuevo webhook con esta URL:",
        webhookUrl,
        "Usa un Verify Token personalizado (lo necesitarás después)",
        "Selecciona los campos: feed, messages"
      ]
    },
    {
      title: "5. Obtener Credenciales",
      description: "Copia las credenciales de tu app",
      details: [
        "Ve a Configuración > Básica",
        "Copia el 'ID de la app'",
        "Copia el 'Secreto de la app' (haz clic en 'Mostrar')",
        "También necesitarás el Verify Token que usaste en el paso 4"
      ]
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Guía: Configurar Meta Developers App
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Advertencia importante */}
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5" />
                Importante
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-amber-700 dark:text-amber-300">
                Cada organización debe tener su propia aplicación en Meta Developers. 
                No compartas credenciales entre diferentes organizaciones o clientes.
              </p>
            </CardContent>
          </Card>

          {/* URLs de referencia */}
          <Card>
            <CardHeader>
              <CardTitle>URLs que necesitarás</CardTitle>
              <CardDescription>
                Guarda estas URLs, las necesitarás durante la configuración
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline">Redirect URI</Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(redirectUri, "Redirect URI")}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar
                  </Button>
                </div>
                <code className="block p-2 bg-muted rounded text-sm font-mono break-all">
                  {redirectUri}
                </code>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline">Webhook URL</Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(webhookUrl, "Webhook URL")}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar
                  </Button>
                </div>
                <code className="block p-2 bg-muted rounded text-sm font-mono break-all">
                  {webhookUrl}
                </code>
              </div>
            </CardContent>
          </Card>

          {/* Pasos detallados */}
          <div className="space-y-4">
            {steps.map((step, index) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{step.title}</CardTitle>
                    {step.url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(step.url, '_blank')}
                        className="gap-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        {step.action}
                      </Button>
                    )}
                  </div>
                  <CardDescription>{step.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {step.details.map((detail, detailIndex) => (
                      <li key={detailIndex} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">
                          {detail.startsWith('http') ? (
                            <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono break-all">
                              {detail}
                            </code>
                          ) : (
                            detail
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Siguiente paso */}
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-blue-800 dark:text-blue-400">
                    ¿Ya configuraste tu Meta App?
                  </p>
                  <p className="text-sm text-blue-600 dark:text-blue-500">
                    Regresa al onboarding para ingresar tus credenciales y conectar Instagram
                  </p>
                </div>
                <Button onClick={onClose} className="gap-2">
                  Continuar Configuración
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
