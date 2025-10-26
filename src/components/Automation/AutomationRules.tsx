import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
  Zap,
  Plus,
  Play,
  Pause,
  Settings,
  AlertTriangle,
  Mail,
  Bell,
  Award,
  Clock,
  Target,
  Trash2,
  Edit
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger_type: "performance_change" | "task_deadline" | "event_completion" | "point_milestone";
  trigger_condition: any;
  action_type: "send_notification" | "send_email" | "assign_reward" | "change_status";
  action_config: any;
  active: boolean;
  created_at: string;
  last_executed?: string;
  execution_count: number;
}

export function AutomationRules() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const { toast } = useToast();

  // Mock data for demonstration
  useEffect(() => {
    loadAutomationRules();
  }, []);

  const loadAutomationRules = async () => {
    try {
      setLoading(true);
      
      // Mock automation rules - replace with real Supabase queries
      const mockRules: AutomationRule[] = [
        {
          id: "1",
          name: "Advertencia por Performance",
          description: "Enviar notificación cuando un embajador recibe 3 advertencias",
          trigger_type: "performance_change",
          trigger_condition: { performance: "advertencia", count: 3 },
          action_type: "send_notification",
          action_config: { 
            message: "El embajador {ambassador_name} ha recibido 3 advertencias. Revisar performance.",
            recipients: ["admin", "rrpp"]
          },
          active: true,
          created_at: new Date().toISOString(),
          last_executed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          execution_count: 5
        },
        {
          id: "2",
          name: "Reconocimiento por Milestone",
          description: "Asignar recompensa al alcanzar 100 puntos",
          trigger_type: "point_milestone",
          trigger_condition: { points: 100 },
          action_type: "assign_reward",
          action_config: { 
            reward_type: "badge",
            reward_name: "Embajador Destacado",
            auto_notify: true
          },
          active: true,
          created_at: new Date().toISOString(),
          last_executed: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          execution_count: 12
        },
        {
          id: "3",
          name: "Alerta de Evento Próximo",
          description: "Recordatorio 24h antes del evento",
          trigger_type: "task_deadline",
          trigger_condition: { hours_before: 24 },
          action_type: "send_email",
          action_config: { 
            subject: "Recordatorio: Evento mañana",
            template: "event_reminder",
            send_to_ambassadors: true
          },
          active: false,
          created_at: new Date().toISOString(),
          execution_count: 0
        }
      ];

      setRules(mockRules);
    } catch (error) {
      console.error("Error loading automation rules:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las reglas de automatización",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleRuleStatus = async (ruleId: string) => {
    try {
      setRules(prev => prev.map(rule => 
        rule.id === ruleId 
          ? { ...rule, active: !rule.active }
          : rule
      ));

      toast({
        title: "Regla actualizada",
        description: "El estado de la regla ha sido cambiado"
      });
    } catch (error) {
      console.error("Error toggling rule:", error);
    }
  };

  const executeRule = async (ruleId: string) => {
    try {
      // Mock execution
      setRules(prev => prev.map(rule => 
        rule.id === ruleId 
          ? { 
              ...rule, 
              last_executed: new Date().toISOString(),
              execution_count: rule.execution_count + 1
            }
          : rule
      ));

      toast({
        title: "Regla ejecutada",
        description: "La regla se ha ejecutado correctamente"
      });
    } catch (error) {
      console.error("Error executing rule:", error);
    }
  };

  const deleteRule = async (ruleId: string) => {
    try {
      setRules(prev => prev.filter(rule => rule.id !== ruleId));
      
      toast({
        title: "Regla eliminada",
        description: "La regla de automatización ha sido eliminada"
      });
    } catch (error) {
      console.error("Error deleting rule:", error);
    }
  };

  const getTriggerIcon = (type: string) => {
    switch (type) {
      case "performance_change":
        return <AlertTriangle className="w-4 h-4" />;
      case "task_deadline":
        return <Clock className="w-4 h-4" />;
      case "event_completion":
        return <Target className="w-4 h-4" />;
      case "point_milestone":
        return <Award className="w-4 h-4" />;
      default:
        return <Zap className="w-4 h-4" />;
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case "send_notification":
        return <Bell className="w-4 h-4" />;
      case "send_email":
        return <Mail className="w-4 h-4" />;
      case "assign_reward":
        return <Award className="w-4 h-4" />;
      default:
        return <Zap className="w-4 h-4" />;
    }
  };

  const formatLastExecution = (dateString?: string) => {
    if (!dateString) return "Nunca";
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) return `Hace ${diffInHours} horas`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `Hace ${diffInDays} días`;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-64" />
          <div className="grid gap-4">
            {[...Array(3)].map((_, i) => (
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
            Automatización
          </h1>
          <p className="text-muted-foreground">
            Configura reglas automáticas para optimizar la gestión de embajadores
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Regla
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Crear Regla de Automatización</DialogTitle>
              <DialogDescription>
                Define los disparadores y acciones para automatizar procesos
              </DialogDescription>
            </DialogHeader>
            <AutomationRuleForm 
              rule={editingRule}
              onSave={() => {
                setDialogOpen(false);
                setEditingRule(null);
                loadAutomationRules();
              }}
              onCancel={() => {
                setDialogOpen(false);
                setEditingRule(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Zap className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Reglas Activas</p>
                <p className="text-2xl font-bold">{rules.filter(r => r.active).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Play className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ejecuciones Hoy</p>
                <p className="text-2xl font-bold">
                  {rules.reduce((sum, rule) => sum + rule.execution_count, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Pause className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Reglas Pausadas</p>
                <p className="text-2xl font-bold">{rules.filter(r => !r.active).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Settings className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Reglas</p>
                <p className="text-2xl font-bold">{rules.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rules List */}
      <div className="space-y-4">
        {rules.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="p-8 text-center">
              <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No hay reglas configuradas</h3>
              <p className="text-muted-foreground mb-4">
                Crea tu primera regla de automatización para optimizar los procesos
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Crear Primera Regla
              </Button>
            </CardContent>
          </Card>
        ) : (
          rules.map((rule) => (
            <Card key={rule.id} className="shadow-card">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold">{rule.name}</h3>
                      <Badge variant={rule.active ? "default" : "secondary"}>
                        {rule.active ? "Activa" : "Pausada"}
                      </Badge>
                    </div>
                    
                    <p className="text-muted-foreground mb-4">{rule.description}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Disparador</h4>
                        <div className="flex items-center space-x-2 p-2 bg-muted/50 rounded">
                          {getTriggerIcon(rule.trigger_type)}
                          <span className="text-sm capitalize">
                            {rule.trigger_type.replace("_", " ")}
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Acción</h4>
                        <div className="flex items-center space-x-2 p-2 bg-muted/50 rounded">
                          {getActionIcon(rule.action_type)}
                          <span className="text-sm capitalize">
                            {rule.action_type.replace("_", " ")}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-6 mt-4 text-sm text-muted-foreground">
                      <span>Ejecutada: {formatLastExecution(rule.last_executed)}</span>
                      <span>Veces ejecutada: {rule.execution_count}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <Switch
                      checked={rule.active}
                      onCheckedChange={() => toggleRuleStatus(rule.id)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => executeRule(rule.id)}
                      disabled={!rule.active}
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingRule(rule);
                        setDialogOpen(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteRule(rule.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function AutomationRuleForm({ rule, onSave, onCancel }: {
  rule: AutomationRule | null;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    name: rule?.name || "",
    description: rule?.description || "",
    trigger_type: rule?.trigger_type || "performance_change",
    action_type: rule?.action_type || "send_notification",
    active: rule?.active ?? true
  });

  const handleSave = () => {
    // Mock save - implement real logic
    onSave();
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="rule-name">Nombre de la Regla</Label>
          <Input
            id="rule-name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Ej: Alerta por performance baja"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="rule-description">Descripción</Label>
          <Textarea
            id="rule-description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe qué hace esta regla..."
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Disparador</Label>
            <Select
              value={formData.trigger_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, trigger_type: value as any }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="performance_change">Cambio de Performance</SelectItem>
                <SelectItem value="task_deadline">Fecha Límite de Tarea</SelectItem>
                <SelectItem value="event_completion">Finalización de Evento</SelectItem>
                <SelectItem value="point_milestone">Milestone de Puntos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Acción</Label>
            <Select
              value={formData.action_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, action_type: value as any }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="send_notification">Enviar Notificación</SelectItem>
                <SelectItem value="send_email">Enviar Email</SelectItem>
                <SelectItem value="assign_reward">Asignar Recompensa</SelectItem>
                <SelectItem value="change_status">Cambiar Estado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Switch
            id="rule-active"
            checked={formData.active}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
          />
          <Label htmlFor="rule-active">Activar regla inmediatamente</Label>
        </div>
      </div>
      
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={!formData.name}>
          {rule ? "Actualizar" : "Crear"} Regla
        </Button>
      </div>
    </div>
  );
}