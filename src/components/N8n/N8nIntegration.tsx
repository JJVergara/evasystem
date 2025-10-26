import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Webhook, Send, Link, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface N8nEndpoint {
  id: string;
  name: string;
  description: string;
  url: string;
  method: 'POST' | 'GET' | 'PUT' | 'DELETE';
  active: boolean;
}

export default function N8nIntegration() {
  const [endpoints] = useState<N8nEndpoint[]>([
    {
      id: '1',
      name: 'Crear Evento',
      description: 'Webhook para crear eventos y asociar embajadores',
      url: 'https://n8n.your-domain.com/webhook/create-event',
      method: 'POST',
      active: true
    },
    {
      id: '2',
      name: 'Importar Embajadores',
      description: 'Webhook para importar embajadores desde archivos',
      url: 'https://n8n.your-domain.com/webhook/import-ambassadors',
      method: 'POST',
      active: true
    },
    {
      id: '3',
      name: 'Sincronizar Instagram',
      description: 'Webhook para sincronizar datos de Instagram',
      url: 'https://n8n.your-domain.com/webhook/sync-instagram',
      method: 'POST',
      active: false
    }
  ]);

  const [testData, setTestData] = useState('');
  const [selectedEndpoint, setSelectedEndpoint] = useState<N8nEndpoint | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const testWebhook = async (endpoint: N8nEndpoint) => {
    if (!testData.trim()) {
      toast.error('Ingresa datos de prueba en formato JSON');
      return;
    }

    try {
      setIsLoading(true);
      
      let parsedData;
      try {
        parsedData = JSON.parse(testData);
      } catch (error) {
        toast.error('Formato JSON inválido');
        return;
      }

      const response = await fetch(endpoint.url, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(parsedData),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Webhook ejecutado exitosamente: ${endpoint.name}`);
        console.log('Webhook response:', result);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Webhook test error:', error);
      toast.error(`Error al ejecutar webhook: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const copyWebhookUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('URL copiada al portapapeles');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="w-5 h-5" />
            Integración n8n
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Configura y prueba los webhooks de n8n para automatizar los flujos del sistema EVA.
            </p>
            
            <div className="grid gap-4">
              {endpoints.map((endpoint) => (
                <div key={endpoint.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{endpoint.name}</h4>
                        <Badge variant={endpoint.active ? "default" : "secondary"}>
                          {endpoint.method}
                        </Badge>
                        {endpoint.active ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-yellow-500" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {endpoint.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-3">
                    <code className="flex-1 text-xs bg-muted p-2 rounded">
                      {endpoint.url}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyWebhookUrl(endpoint.url)}
                    >
                      <Link className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedEndpoint(endpoint)}
                      disabled={!endpoint.active}
                    >
                      Probar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedEndpoint && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Probar Webhook: {selectedEndpoint.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Datos de prueba (JSON)</Label>
              <Textarea
                placeholder='{"title": "Evento de prueba", "description": "Descripción del evento"}'
                value={testData}
                onChange={(e) => setTestData(e.target.value)}
                className="mt-1 font-mono text-sm"
                rows={8}
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={() => testWebhook(selectedEndpoint)}
                disabled={isLoading}
              >
                {isLoading ? 'Enviando...' : 'Enviar Webhook'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedEndpoint(null)}
              >
                Cancelar
              </Button>
            </div>
            
            <Separator />
            
            <div className="text-sm text-muted-foreground">
              <h5 className="font-medium mb-2">Ejemplos de datos:</h5>
              
              {selectedEndpoint.name === 'Crear Evento' && (
                <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`{
  "title": "Lanzamiento Producto X",
  "description": "Evento de lanzamiento",
  "date": "2024-02-15",
  "location": "Centro de Convenciones",
  "embassadors": ["uuid1", "uuid2"],
  "user_id": "user-uuid"
}`}
                </pre>
              )}
              
              {selectedEndpoint.name === 'Importar Embajadores' && (
                <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`{
  "embassadors": [
    {
      "name": "Juan Pérez",
      "email": "juan@email.com",
      "phone": "+56912345678",
      "events": ["event-uuid"]
    }
  ],
  "user_id": "user-uuid"
}`}
                </pre>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}