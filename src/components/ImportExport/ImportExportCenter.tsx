import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  Download,
  FileText,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  XCircle,
  Eye,
  Settings,
  Calendar,
  Users,
  History,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ImportLog {
  id: string;
  type: "import" | "export";
  source: "manual" | "google_drive" | "excel" | "csv";
  file_name: string;
  status: "pending" | "processing" | "completed" | "failed";
  result_json: {
    total_records: number;
    successful: number;
    failed: number;
    incomplete: number;
    errors: Array<{ row: number; field: string; message: string }>;
  };
  created_at: string;
  user_id: string;
}

interface FieldMapping {
  source_field: string;
  target_field: string;
  required: boolean;
  validated: boolean;
}

export function ImportExportCenter() {
  const [activeTab, setActiveTab] = useState("import");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [importLogs, setImportLogs] = useState<ImportLog[]>([]);
  const [exportConfig, setExportConfig] = useState({
    format: "excel",
    entity: "ambassadors",
    period: "all",
    fields: [] as string[],
    filters: {}
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const requiredFields = {
    ambassadors: [
      { key: "first_name", label: "Nombre", required: true },
      { key: "last_name", label: "Apellido", required: true },
      { key: "email", label: "Email", required: true },
      { key: "rut", label: "RUT", required: true },
      { key: "date_of_birth", label: "Fecha de Nacimiento", required: true },
      { key: "instagram_user", label: "Usuario Instagram", required: true },
      { key: "follower_count", label: "Seguidores", required: false },
      { key: "profile_picture_url", label: "Foto de Perfil", required: false }
    ]
  };

  const exportFields = {
    ambassadors: [
      "first_name", "last_name", "email", "rut", "date_of_birth", 
      "instagram_user", "follower_count", "global_points", "global_category",
      "performance_status", "events_participated", "completed_tasks", "failed_tasks"
    ],
    events: [
      "name", "description", "event_date", "location", "main_hashtag", 
      "instagram_account", "active", "is_cyclic", "cyclic_type"
    ],
    tasks: [
      "task_type", "status", "upload_time", "expiry_time", "points_earned",
      "instagram_story_id", "story_url", "time_in_air"
    ]
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImportFile(file);
      parseFile(file);
    }
  };

  const parseFile = async (file: File) => {
    try {
      setIsProcessing(true);
      
      // Mock file parsing - replace with actual CSV/Excel parsing
      const mockPreviewData = [
        { nombre: "María", apellido: "González", email: "maria@email.com", rut: "12345678-9", instagram: "@maria_g" },
        { nombre: "Carlos", apellido: "Ruiz", email: "carlos@email.com", rut: "87654321-0", instagram: "@carlos_r" },
        { nombre: "Ana", apellido: "Silva", email: "ana@email.com", rut: "11223344-5", instagram: "@ana_s" }
      ];

      setPreviewData(mockPreviewData);

      // Auto-detect field mappings
      const sourceFields = Object.keys(mockPreviewData[0] || {});
      const mappings: FieldMapping[] = requiredFields.ambassadors.map(targetField => {
        const sourceField = sourceFields.find(sf => 
          sf.toLowerCase().includes(targetField.key.toLowerCase()) ||
          targetField.label.toLowerCase().includes(sf.toLowerCase())
        ) || "";
        
        return {
          source_field: sourceField,
          target_field: targetField.key,
          required: targetField.required,
          validated: sourceField !== ""
        };
      });

      setFieldMappings(mappings);
      
    } catch (error) {
      console.error("Error parsing file:", error);
      toast({
        title: "Error",
        description: "No se pudo procesar el archivo",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const updateFieldMapping = (targetField: string, sourceField: string) => {
    setFieldMappings(prev => 
      prev.map(mapping => 
        mapping.target_field === targetField 
          ? { ...mapping, source_field: sourceField, validated: sourceField !== "" && sourceField !== "none" }
          : mapping
      )
    );
  };

  const processImport = async () => {
    try {
      setIsProcessing(true);
      setImportProgress(0);

      // Validate mappings
      const invalidMappings = fieldMappings.filter(m => m.required && !m.validated);
      if (invalidMappings.length > 0) {
        toast({
          title: "Error de validación",
          description: "Faltan campos obligatorios por mapear",
          variant: "destructive"
        });
        return;
      }

      // Simulate import progress
      for (let i = 0; i <= 100; i += 10) {
        setImportProgress(i);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Create import log
      const newLog: ImportLog = {
        id: Date.now().toString(),
        type: "import",
        source: importFile?.name.endsWith('.csv') ? 'csv' : 'excel',
        file_name: importFile?.name || "",
        status: "completed",
        result_json: {
          total_records: previewData.length,
          successful: previewData.length - 1,
          failed: 1,
          incomplete: 0,
          errors: [
            { row: 3, field: "email", message: "Email inválido" }
          ]
        },
        created_at: new Date().toISOString(),
        user_id: "current-user"
      };

      setImportLogs(prev => [newLog, ...prev]);

      toast({
        title: "Importación completada",
        description: `Se importaron ${newLog.result_json.successful} de ${newLog.result_json.total_records} registros`
      });

      // Reset form
      setImportFile(null);
      setPreviewData([]);
      setFieldMappings([]);
      setImportProgress(0);
      
    } catch (error) {
      console.error("Error during import:", error);
      toast({
        title: "Error",
        description: "Error durante la importación",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const processExport = async () => {
    try {
      setIsProcessing(true);

      // Simulate export process
      await new Promise(resolve => setTimeout(resolve, 2000));

      const newLog: ImportLog = {
        id: Date.now().toString(),
        type: "export",
        source: "manual",
        file_name: `${exportConfig.entity}_export_${new Date().toISOString().split('T')[0]}.${exportConfig.format}`,
        status: "completed",
        result_json: {
          total_records: 156,
          successful: 156,
          failed: 0,
          incomplete: 0,
          errors: []
        },
        created_at: new Date().toISOString(),
        user_id: "current-user"
      };

      setImportLogs(prev => [newLog, ...prev]);

      toast({
        title: "Exportación completada",
        description: `Se exportaron ${newLog.result_json.total_records} registros`
      });

    } catch (error) {
      console.error("Error during export:", error);
      toast({
        title: "Error",
        description: "Error durante la exportación",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Importación y Exportación
          </h1>
          <p className="text-muted-foreground">
            Gestiona la importación y exportación de datos
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="import">Importar</TabsTrigger>
          <TabsTrigger value="export">Exportar</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>

        {/* Import Tab */}
        <TabsContent value="import" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* File Upload */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Upload className="w-5 h-5 mr-2" />
                  Subir Archivo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-primary/20 rounded-lg p-6 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  
                  {importFile ? (
                    <div className="space-y-2">
                      <FileSpreadsheet className="w-12 h-12 text-primary mx-auto" />
                      <p className="font-medium">{importFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(importFile.size / 1024).toFixed(1)} KB
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Cambiar archivo
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-12 h-12 text-muted-foreground mx-auto" />
                      <p className="text-lg font-medium">Arrastra tu archivo aquí</p>
                      <p className="text-sm text-muted-foreground">
                        Soporta archivos Excel (.xlsx, .xls) y CSV
                      </p>
                      <Button onClick={() => fileInputRef.current?.click()}>
                        Seleccionar archivo
                      </Button>
                    </div>
                  )}
                </div>

                {importFile && previewData.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-medium">Vista previa de datos</h3>
                    <div className="border rounded-lg overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            {Object.keys(previewData[0]).map(key => (
                              <th key={key} className="px-3 py-2 text-left font-medium">
                                {key}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.slice(0, 3).map((row, index) => (
                            <tr key={index} className="border-t">
                              {Object.values(row).map((value: any, cellIndex) => (
                                <td key={cellIndex} className="px-3 py-2">
                                  {value}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Mostrando 3 de {previewData.length} registros
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Field Mapping */}
            {fieldMappings.length > 0 && (
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="w-5 h-5 mr-2" />
                    Mapeo de Campos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {fieldMappings.map((mapping) => (
                    <div key={mapping.target_field} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">
                          {requiredFields.ambassadors.find(f => f.key === mapping.target_field)?.label}
                          {mapping.required && <span className="text-destructive ml-1">*</span>}
                        </Label>
                        {mapping.validated ? (
                          <CheckCircle className="w-4 h-4 text-success" />
                        ) : mapping.required ? (
                          <XCircle className="w-4 h-4 text-destructive" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-warning" />
                        )}
                      </div>
                      <Select
                        value={mapping.source_field}
                        onValueChange={(value) => updateFieldMapping(mapping.target_field, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar campo del archivo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin mapear</SelectItem>
                          {Object.keys(previewData[0] || {}).map(field => (
                            <SelectItem key={field} value={field}>
                              {field}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}

                  {isProcessing && (
                    <div className="space-y-2">
                      <Label>Progreso de importación</Label>
                      <Progress value={importProgress} className="w-full" />
                      <p className="text-sm text-muted-foreground">{importProgress}%</p>
                    </div>
                  )}

                  <Button 
                    onClick={processImport} 
                    disabled={isProcessing || fieldMappings.some(m => m.required && !m.validated)}
                    className="w-full"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Iniciar Importación
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Export Tab */}
        <TabsContent value="export" className="space-y-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Download className="w-5 h-5 mr-2" />
                Configurar Exportación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de datos</Label>
                  <Select 
                    value={exportConfig.entity} 
                    onValueChange={(value) => setExportConfig(prev => ({ ...prev, entity: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ambassadors">Embajadores</SelectItem>
                      <SelectItem value="events">Eventos</SelectItem>
                      <SelectItem value="tasks">Tareas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Formato</Label>
                  <Select 
                    value={exportConfig.format} 
                    onValueChange={(value) => setExportConfig(prev => ({ ...prev, format: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Período</Label>
                  <Select 
                    value={exportConfig.period} 
                    onValueChange={(value) => setExportConfig(prev => ({ ...prev, period: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los registros</SelectItem>
                      <SelectItem value="month">Último mes</SelectItem>
                      <SelectItem value="quarter">Último trimestre</SelectItem>
                      <SelectItem value="year">Último año</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button onClick={processExport} disabled={isProcessing} className="w-full">
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Exportando...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Exportar
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <Label>Campos a incluir</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {exportFields[exportConfig.entity as keyof typeof exportFields]?.map(field => (
                    <div key={field} className="flex items-center space-x-2">
                      <Checkbox
                        id={field}
                        checked={exportConfig.fields.includes(field)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setExportConfig(prev => ({
                              ...prev,
                              fields: [...prev.fields, field]
                            }));
                          } else {
                            setExportConfig(prev => ({
                              ...prev,
                              fields: prev.fields.filter(f => f !== field)
                            }));
                          }
                        }}
                      />
                      <Label htmlFor={field} className="text-sm">
                        {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <History className="w-5 h-5 mr-2" />
                Historial de Operaciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {importLogs.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No hay operaciones registradas</h3>
                    <p className="text-muted-foreground">
                      Las importaciones y exportaciones aparecerán aquí
                    </p>
                  </div>
                ) : (
                  importLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          {log.type === "import" ? (
                            <Upload className="w-5 h-5 text-primary" />
                          ) : (
                            <Download className="w-5 h-5 text-success" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium">{log.file_name}</h4>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span>{log.type === "import" ? "Importación" : "Exportación"}</span>
                            <span>{new Date(log.created_at).toLocaleDateString()}</span>
                            <span>{log.result_json.total_records} registros</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge 
                          variant={
                            log.status === "completed" ? "secondary" :
                            log.status === "failed" ? "destructive" : "outline"
                          }
                        >
                          {log.status === "completed" ? "Completado" :
                           log.status === "failed" ? "Fallido" : "Pendiente"}
                        </Badge>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}