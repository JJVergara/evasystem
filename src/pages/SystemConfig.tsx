import { MainLayout } from "@/components/Layout/MainLayout";
import N8nIntegration from "@/components/N8n/N8nIntegration";
import { SystemHealthDashboard } from "@/components/System/SystemHealthDashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Webhook, Database, Shield, Activity } from "lucide-react";

export default function SystemConfig() {
  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Settings className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-gradient">Configuración del Sistema</h1>
            <p className="text-muted-foreground">
              Configuración avanzada de EVA System v1.1
            </p>
          </div>
        </div>

        <Tabs defaultValue="health" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="health" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              System Health
            </TabsTrigger>
            <TabsTrigger value="n8n" className="flex items-center gap-2">
              <Webhook className="w-4 h-4" />
              n8n
            </TabsTrigger>
            <TabsTrigger value="database" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              Base de Datos
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Seguridad
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="health">
            <SystemHealthDashboard />
          </TabsContent>

          <TabsContent value="n8n">
            <N8nIntegration />
          </TabsContent>

          <TabsContent value="database">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Estado de la Base de Datos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">Tablas Principales</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>✅ users</li>
                        <li>✅ profiles</li>
                        <li>✅ events</li>
                        <li>✅ embassadors</li>
                        <li>✅ cards</li>
                        <li>✅ event_logs</li>
                      </ul>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">Políticas RLS</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>✅ Habilitadas en todas las tablas</li>
                        <li>✅ Políticas por organización</li>
                        <li>✅ Funciones de seguridad</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Configuración de Seguridad
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">Estado de Seguridad</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span>Row Level Security (RLS)</span>
                        <span className="text-green-600 font-medium">✅ Habilitado</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Funciones SECURITY DEFINER</span>
                        <span className="text-green-600 font-medium">✅ Configuradas</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Search Path Seguro</span>
                        <span className="text-green-600 font-medium">✅ Configurado</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>Sistema de Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    El sistema de logs está completamente configurado y registra todas las acciones importantes:
                  </p>
                  <ul className="text-sm space-y-1">
                    <li>• Creación de eventos</li>
                    <li>• Agregado de embajadores</li>
                    <li>• Importación/Exportación de datos</li>
                    <li>• Configuración de Instagram</li>
                    <li>• Cambios en perfiles de usuario</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}