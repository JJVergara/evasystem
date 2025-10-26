import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileText,
  Download,
  Calendar,
  Clock,
  MoreVertical,
  Plus,
  Send,
  Settings,
  ExternalLink,
  FileSpreadsheet,
  Mail,
  Archive
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ScheduledReport {
  id: string;
  name: string;
  type: "weekly" | "monthly" | "custom";
  frequency: string;
  format: "pdf" | "excel" | "csv";
  recipients: string[];
  last_generated?: string;
  next_generation: string;
  active: boolean;
  template: string;
  filters: any;
}

interface GeneratedReport {
  id: string;
  name: string;
  type: string;
  format: string;
  size: string;
  generated_at: string;
  download_url: string;
  generated_by: string;
}

export function ReportsCenter() {
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("scheduled");
  const { toast } = useToast();

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      
      // Mock data for demonstration
      const mockScheduled: ScheduledReport[] = [
        {
          id: "1",
          name: "Reporte Semanal de Performance",
          type: "weekly",
          frequency: "Lunes 09:00",
          format: "pdf",
          recipients: ["admin@empresa.com", "rrpp@empresa.com"],
          last_generated: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          next_generation: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          active: true,
          template: "performance_summary",
          filters: { events: "all", period: "last_week" }
        },
        {
          id: "2",
          name: "Resumen Mensual Ejecutivo",
          type: "monthly",
          frequency: "1er día del mes",
          format: "excel",
          recipients: ["director@empresa.com"],
          last_generated: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          next_generation: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          active: true,
          template: "executive_summary",
          filters: { events: "all", period: "last_month" }
        }
      ];

      const mockGenerated: GeneratedReport[] = [
        {
          id: "1",
          name: "Reporte Semanal - Semana 3",
          type: "performance_summary",
          format: "PDF",
          size: "2.4 MB",
          generated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          download_url: "#",
          generated_by: "Sistema Automático"
        },
        {
          id: "2",
          name: "Exportación Embajadores Enero",
          type: "ambassadors_export",
          format: "Excel",
          size: "1.8 MB",
          generated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          download_url: "#",
          generated_by: "María García"
        },
        {
          id: "3",
          name: "Análisis de Eventos Q1",
          type: "events_analysis",
          format: "PDF",
          size: "3.2 MB",
          generated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          download_url: "#",
          generated_by: "Carlos Ruiz"
        }
      ];

      setScheduledReports(mockScheduled);
      setGeneratedReports(mockGenerated);
    } catch (error) {
      console.error("Error loading reports:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los reportes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async (reportId: string) => {
    try {
      toast({
        title: "Generando reporte",
        description: "El reporte se está generando. Te notificaremos cuando esté listo."
      });
    } catch (error) {
      console.error("Error generating report:", error);
    }
  };

  const toggleReportStatus = async (reportId: string) => {
    try {
      setScheduledReports(prev => prev.map(report => 
        report.id === reportId 
          ? { ...report, active: !report.active }
          : report
      ));

      toast({
        title: "Reporte actualizado",
        description: "El estado del reporte programado ha sido cambiado"
      });
    } catch (error) {
      console.error("Error toggling report:", error);
    }
  };

  const downloadReport = async (reportId: string) => {
    try {
      toast({
        title: "Descargando reporte",
        description: "La descarga comenzará en unos segundos"
      });
    } catch (error) {
      console.error("Error downloading report:", error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getFormatIcon = (format: string) => {
    switch (format.toLowerCase()) {
      case "pdf":
        return <FileText className="w-4 h-4 text-red-500" />;
      case "excel":
      case "xlsx":
        return <FileSpreadsheet className="w-4 h-4 text-green-500" />;
      case "csv":
        return <FileSpreadsheet className="w-4 h-4 text-blue-500" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
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
            Centro de Reportes
          </h1>
          <p className="text-muted-foreground">
            Gestiona reportes automáticos y exportaciones programadas
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Reporte
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Configurar Reporte Automático</DialogTitle>
              <DialogDescription>
                Configura un reporte programado que se genere automáticamente
              </DialogDescription>
            </DialogHeader>
            <ReportForm onSave={() => setDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Reportes Programados</p>
                <p className="text-2xl font-bold">{scheduledReports.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <FileText className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Generados Este Mes</p>
                <p className="text-2xl font-bold">{generatedReports.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Próximo Reporte</p>
                <p className="text-sm font-bold">En 1 día</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Download className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Descargas Total</p>
                <p className="text-2xl font-bold">128</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="scheduled">Programados</TabsTrigger>
          <TabsTrigger value="generated">Generados</TabsTrigger>
          <TabsTrigger value="templates">Plantillas</TabsTrigger>
        </TabsList>

        <TabsContent value="scheduled" className="space-y-4">
          {scheduledReports.length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="p-8 text-center">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No hay reportes programados</h3>
                <p className="text-muted-foreground mb-4">
                  Configura reportes automáticos para recibir información periódicamente
                </p>
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Programar Primer Reporte
                </Button>
              </CardContent>
            </Card>
          ) : (
            scheduledReports.map((report) => (
              <Card key={report.id} className="shadow-card">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold">{report.name}</h3>
                        <Badge variant={report.active ? "default" : "secondary"}>
                          {report.active ? "Activo" : "Pausado"}
                        </Badge>
                        <Badge variant="outline">
                          {report.format.toUpperCase()}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Frecuencia</p>
                          <p className="font-medium">{report.frequency}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Próxima generación</p>
                          <p className="font-medium">{formatDate(report.next_generation)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Destinatarios</p>
                          <p className="font-medium">{report.recipients.length} personas</p>
                        </div>
                      </div>
                      
                      {report.last_generated && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Último generado: {formatDate(report.last_generated)}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <Switch
                        checked={report.active}
                        onCheckedChange={() => toggleReportStatus(report.id)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => generateReport(report.id)}
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem>
                            <Settings className="w-4 h-4 mr-2" />
                            Configurar
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Mail className="w-4 h-4 mr-2" />
                            Enviar Ahora
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Archive className="w-4 h-4 mr-2" />
                            Archivar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="generated" className="space-y-4">
          {generatedReports.length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="p-8 text-center">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No hay reportes generados</h3>
                <p className="text-muted-foreground">
                  Los reportes generados aparecerán aquí para su descarga
                </p>
              </CardContent>
            </Card>
          ) : (
            generatedReports.map((report) => (
              <Card key={report.id} className="shadow-card">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getFormatIcon(report.format)}
                      <div>
                        <h4 className="font-medium">{report.name}</h4>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>{report.size}</span>
                          <span>{formatDate(report.generated_at)}</span>
                          <span>por {report.generated_by}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => downloadReport(report.id)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card className="shadow-card">
            <CardContent className="p-8 text-center">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Plantillas de Reportes</h3>
              <p className="text-muted-foreground">
                Próximamente: editor de plantillas personalizadas
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ReportForm({ onSave }: { onSave: () => void }) {
  const [formData, setFormData] = useState({
    name: "",
    type: "weekly",
    format: "pdf",
    recipients: "",
    active: true
  });

  const handleSave = () => {
    // Mock save - implement real logic
    onSave();
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="report-name">Nombre del Reporte</Label>
          <Input
            id="report-name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Ej: Reporte Semanal de Performance"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Tipo de Reporte</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="monthly">Mensual</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Formato</Label>
            <Select
              value={formData.format}
              onValueChange={(value) => setFormData(prev => ({ ...prev, format: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="excel">Excel</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="recipients">Destinatarios (emails separados por coma)</Label>
          <Input
            id="recipients"
            value={formData.recipients}
            onChange={(e) => setFormData(prev => ({ ...prev, recipients: e.target.value }))}
            placeholder="admin@empresa.com, rrpp@empresa.com"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Switch
            id="report-active"
            checked={formData.active}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
          />
          <Label htmlFor="report-active">Activar reporte inmediatamente</Label>
        </div>
      </div>
      
      <div className="flex justify-end space-x-2">
        <Button variant="outline">
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={!formData.name}>
          Crear Reporte
        </Button>
      </div>
    </div>
  );
}