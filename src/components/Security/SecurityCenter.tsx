import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Shield,
  Key,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Smartphone,
  Monitor,
  LogOut,
  Settings,
  Eye,
  Download
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SecurityEvent {
  id: string;
  type: "login" | "failed_login" | "password_change" | "suspicious_activity";
  description: string;
  user_email: string;
  ip_address: string;
  location: string;
  device: string;
  timestamp: string;
  risk_level: "low" | "medium" | "high";
}

interface ActiveSession {
  id: string;
  user_email: string;
  device: string;
  location: string;
  ip_address: string;
  last_activity: string;
  is_current: boolean;
}

interface SecurityPolicy {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  value: any;
}

export function SecurityCenter() {
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [securityPolicies, setSecurityPolicies] = useState<SecurityPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("events");
  const { toast } = useToast();

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    try {
      setLoading(true);
      
      // Mock data for demonstration
      const mockEvents: SecurityEvent[] = [
        {
          id: "1",
          type: "login",
          description: "Inicio de sesión exitoso",
          user_email: "admin@empresa.com",
          ip_address: "192.168.1.100",
          location: "Santiago, Chile",
          device: "Chrome - Windows",
          timestamp: new Date().toISOString(),
          risk_level: "low"
        },
        {
          id: "2",
          type: "failed_login",
          description: "Intento de acceso fallido",
          user_email: "admin@empresa.com",
          ip_address: "203.0.113.1",
          location: "Ubicación desconocida",
          device: "Chrome - Linux",
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          risk_level: "medium"
        },
        {
          id: "3",
          type: "suspicious_activity",
          description: "Múltiples intentos de acceso desde IP diferente",
          user_email: "rrpp@empresa.com",
          ip_address: "198.51.100.1",
          location: "Buenos Aires, Argentina",
          device: "Firefox - macOS",
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          risk_level: "high"
        }
      ];

      const mockSessions: ActiveSession[] = [
        {
          id: "1",
          user_email: "admin@empresa.com",
          device: "Chrome - Windows",
          location: "Santiago, Chile",
          ip_address: "192.168.1.100",
          last_activity: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          is_current: true
        },
        {
          id: "2",
          user_email: "admin@empresa.com",
          device: "Safari - iPhone",
          location: "Santiago, Chile",
          ip_address: "192.168.1.101",
          last_activity: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          is_current: false
        }
      ];

      const mockPolicies: SecurityPolicy[] = [
        {
          id: "1",
          name: "Contraseña Fuerte",
          description: "Requerir contraseñas con al menos 8 caracteres, mayúsculas, minúsculas y números",
          enabled: true,
          value: { min_length: 8, require_uppercase: true, require_numbers: true }
        },
        {
          id: "2",
          name: "Autenticación de Dos Factores",
          description: "Habilitar 2FA obligatorio para administradores",
          enabled: false,
          value: { required_for_admins: true }
        },
        {
          id: "3",
          name: "Expiración de Sesión",
          description: "Cerrar sesiones automáticamente después de inactividad",
          enabled: true,
          value: { timeout_minutes: 60 }
        },
        {
          id: "4",
          name: "Alertas de Ubicación",
          description: "Notificar cuando se detecte acceso desde nueva ubicación",
          enabled: true,
          value: { notify_new_location: true }
        }
      ];

      setSecurityEvents(mockEvents);
      setActiveSessions(mockSessions);
      setSecurityPolicies(mockPolicies);
    } catch (error) {
      console.error("Error loading security data:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos de seguridad",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const terminateSession = async (sessionId: string) => {
    try {
      setActiveSessions(prev => prev.filter(session => session.id !== sessionId));
      
      toast({
        title: "Sesión terminada",
        description: "La sesión ha sido cerrada exitosamente"
      });
    } catch (error) {
      console.error("Error terminating session:", error);
    }
  };

  const togglePolicy = async (policyId: string) => {
    try {
      setSecurityPolicies(prev => prev.map(policy => 
        policy.id === policyId 
          ? { ...policy, enabled: !policy.enabled }
          : policy
      ));

      toast({
        title: "Política actualizada",
        description: "La configuración de seguridad ha sido actualizada"
      });
    } catch (error) {
      console.error("Error updating policy:", error);
    }
  };

  const exportSecurityLog = async () => {
    try {
      toast({
        title: "Exportando log",
        description: "El log de seguridad se está generando para descarga"
      });
    } catch (error) {
      console.error("Error exporting log:", error);
    }
  };

  const getRiskLevelBadge = (level: string) => {
    switch (level) {
      case "high":
        return <Badge variant="destructive">Alto Riesgo</Badge>;
      case "medium":
        return <Badge variant="secondary">Riesgo Medio</Badge>;
      case "low":
        return <Badge variant="outline">Bajo Riesgo</Badge>;
      default:
        return null;
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case "login":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "failed_login":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "suspicious_activity":
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Shield className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) return `Hace ${diffInMinutes} min`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `Hace ${diffInHours}h`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `Hace ${diffInDays}d`;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-64" />
          <div className="grid gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Centro de Seguridad
          </h1>
          <p className="text-muted-foreground">
            Monitorea y gestiona la seguridad de tu organización
          </p>
        </div>
        <Button onClick={exportSecurityLog}>
          <Download className="w-4 h-4 mr-2" />
          Exportar Log
        </Button>
      </div>

      {/* Security Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Shield className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estado de Seguridad</p>
                <p className="text-lg font-bold text-green-500">Seguro</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Monitor className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sesiones Activas</p>
                <p className="text-2xl font-bold">{activeSessions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Eventos de Riesgo</p>
                <p className="text-2xl font-bold">
                  {securityEvents.filter(e => e.risk_level === "high").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Key className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Políticas Activas</p>
                <p className="text-2xl font-bold">
                  {securityPolicies.filter(p => p.enabled).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="events">Eventos de Seguridad</TabsTrigger>
          <TabsTrigger value="sessions">Sesiones Activas</TabsTrigger>
          <TabsTrigger value="policies">Políticas</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-4">
          {securityEvents.length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="p-8 text-center">
                <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No hay eventos de seguridad</h3>
                <p className="text-muted-foreground">
                  Los eventos de seguridad aparecerán aquí para su monitoreo
                </p>
              </CardContent>
            </Card>
          ) : (
            securityEvents.map((event) => (
              <Card key={event.id} className="shadow-card">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {getEventIcon(event.type)}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium">{event.description}</h4>
                          {getRiskLevelBadge(event.risk_level)}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <MapPin className="w-3 h-3" />
                            <span>{event.location}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Monitor className="w-3 h-3" />
                            <span>{event.device}</span>
                          </div>
                          <div>Usuario: {event.user_email}</div>
                          <div>IP: {event.ip_address}</div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <div>{formatDate(event.timestamp)}</div>
                      <div>{getTimeAgo(event.timestamp)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          {activeSessions.length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="p-8 text-center">
                <Monitor className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No hay sesiones activas</h3>
                <p className="text-muted-foreground">
                  Las sesiones activas de usuarios aparecerán aquí
                </p>
              </CardContent>
            </Card>
          ) : (
            activeSessions.map((session) => (
              <Card key={session.id} className={`shadow-card ${session.is_current ? 'border-primary' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg">
                        {session.device.includes('iPhone') || session.device.includes('Android') ? 
                          <Smartphone className="w-5 h-5 text-blue-500" /> : 
                          <Monitor className="w-5 h-5 text-blue-500" />
                        }
                      </div>
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium">{session.user_email}</h4>
                          {session.is_current && (
                            <Badge variant="default">Sesión Actual</Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Monitor className="w-3 h-3" />
                            <span>{session.device}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MapPin className="w-3 h-3" />
                            <span>{session.location}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>Activa {getTimeAgo(session.last_activity)}</span>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          IP: {session.ip_address}
                        </div>
                      </div>
                    </div>
                    
                    {!session.is_current && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => terminateSession(session.id)}
                      >
                        <LogOut className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="policies" className="space-y-4">
          {securityPolicies.map((policy) => (
            <Card key={policy.id} className="shadow-card">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold">{policy.name}</h3>
                      <Badge variant={policy.enabled ? "default" : "secondary"}>
                        {policy.enabled ? "Activa" : "Inactiva"}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">{policy.description}</p>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <Switch
                      checked={policy.enabled}
                      onCheckedChange={() => togglePolicy(policy.id)}
                    />
                    <Button variant="ghost" size="sm">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}