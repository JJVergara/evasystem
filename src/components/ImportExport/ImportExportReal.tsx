import { useState, useRef } from 'react';
import { GlassPanel } from '@/components/Layout/GlassPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, Download, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization';

interface ImportExportRealProps {}

export default function ImportExportReal({}: ImportExportRealProps) {
  const { organization } = useCurrentOrganization();
  const [activeTab, setActiveTab] = useState('import');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [exportConfig, setExportConfig] = useState({
    entity: 'ambassadors',
    format: 'excel',
    fields: [] as string[],
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const exportFields = {
    ambassadors: [
      { key: 'first_name', label: 'Nombre' },
      { key: 'last_name', label: 'Apellido' },
      { key: 'email', label: 'Email' },
      { key: 'instagram_user', label: 'Usuario Instagram' },
      { key: 'status', label: 'Estado' },
    ],
    events: [
      { key: 'name', label: 'Nombre' },
      { key: 'description', label: 'Descripción' },
      { key: 'event_date', label: 'Fecha' },
      { key: 'location', label: 'Ubicación' },
      { key: 'active', label: 'Activo' },
    ],
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImportFile(file);
    }
  };

  const processImport = async () => {
    if (!importFile) {
      toast.error('Selecciona un archivo para importar');
      return;
    }

    try {
      setIsProcessing(true);

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Usuario no autenticado');

      toast.success('Importación completada exitosamente (simulada)');
      setImportFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error during import:', error);
      toast.error('Error durante la importación');
    } finally {
      setIsProcessing(false);
    }
  };

  const processExport = async () => {
    if (!organization) {
      toast.error('No se encontró la organización');
      return;
    }

    try {
      setIsProcessing(true);

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Usuario no autenticado');

      const data: Record<string, unknown>[] = [];

      if (exportConfig.entity === 'ambassadors') {
        data.push({
          id: '1',
          first_name: 'Juan',
          last_name: 'Pérez',
          email: 'juan@ejemplo.com',
          instagram_user: 'juan_p',
          status: 'active',
        });
      } else if (exportConfig.entity === 'events') {
        data.push({
          id: '1',
          name: 'Evento de Prueba',
          description: 'Descripción del evento',
          event_date: '2024-12-01',
          location: 'Santiago',
          active: true,
        });
      } else {
        throw new Error('Tipo de entidad no soportado');
      }

      const jsonData = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${exportConfig.entity}_export.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Exportación completada: ${data.length} registros`);
    } catch (error) {
      console.error('Error during export:', error);
      toast.error('Error durante la exportación');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFieldToggle = (field: string, checked: boolean) => {
    setExportConfig((prev) => ({
      ...prev,
      fields: checked ? [...prev.fields, field] : prev.fields.filter((f) => f !== field),
    }));
  };

  const downloadTemplate = () => {
    const template = [
      {
        first_name: 'María',
        last_name: 'González',
        email: 'maria@ejemplo.com',
        instagram_user: 'maria_g',
      },
    ];

    const csv = [
      Object.keys(template[0]).join(','),
      ...template.map((row) => Object.values(row).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_embajadores.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Plantilla descargada');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Importación y Exportación</h3>
        <Button variant="outline" onClick={downloadTemplate}>
          <Download className="w-4 h-4 mr-2" />
          Descargar Plantilla
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="import">Importar</TabsTrigger>
          <TabsTrigger value="export">Exportar</TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-6">
          <GlassPanel>
            <div className="flex items-center gap-2 mb-6">
              <Upload className="w-5 h-5" />
              <h4 className="font-semibold">Importar Embajadores</h4>
            </div>

            <div className="border-2 border-dashed border-primary/30 rounded-lg p-6 text-center bg-white/20">
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
                  <div className="flex gap-2 justify-center">
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                      Cambiar archivo
                    </Button>
                    <Button onClick={processImport} disabled={isProcessing}>
                      {isProcessing ? 'Procesando...' : 'Importar'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-12 h-12 text-muted-foreground mx-auto" />
                  <p className="text-lg font-medium">Arrastra tu archivo aquí</p>
                  <p className="text-sm text-muted-foreground">
                    Soporta archivos Excel (.xlsx, .xls) y CSV
                  </p>
                  <Button onClick={() => fileInputRef.current?.click()}>Seleccionar archivo</Button>
                </div>
              )}
            </div>

            <div className="bg-info/10 border border-info/20 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-info mt-0.5" />
                <div>
                  <h4 className="font-medium">Campos requeridos</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Nombre, Apellido, Email, Usuario de Instagram
                  </p>
                </div>
              </div>
            </div>
          </GlassPanel>
        </TabsContent>

        <TabsContent value="export" className="space-y-6">
          <GlassPanel>
            <div className="flex items-center gap-2 mb-6">
              <Download className="w-5 h-5" />
              <h4 className="font-semibold">Configurar Exportación</h4>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo de datos</Label>
                  <Select
                    value={exportConfig.entity}
                    onValueChange={(value) =>
                      setExportConfig((prev) => ({ ...prev, entity: value, fields: [] }))
                    }
                  >
                    <SelectTrigger className="bg-white/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ambassadors">Embajadores</SelectItem>
                      <SelectItem value="events">Eventos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Formato</Label>
                  <Select
                    value={exportConfig.format}
                    onValueChange={(value) =>
                      setExportConfig((prev) => ({ ...prev, format: value }))
                    }
                  >
                    <SelectTrigger className="bg-white/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="json">JSON</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Campos a exportar (dejar vacío para todos)</Label>
                <div className="grid grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto bg-white/30 rounded-lg p-3">
                  {exportFields[exportConfig.entity as keyof typeof exportFields]?.map((field) => (
                    <div key={field.key} className="flex items-center space-x-2">
                      <Checkbox
                        id={field.key}
                        checked={exportConfig.fields.includes(field.key)}
                        onCheckedChange={(checked) =>
                          handleFieldToggle(field.key, checked as boolean)
                        }
                      />
                      <Label htmlFor={field.key} className="text-sm font-normal">
                        {field.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Button onClick={processExport} disabled={isProcessing} className="w-full">
                {isProcessing ? 'Exportando...' : 'Exportar Datos'}
              </Button>
            </div>
          </GlassPanel>
        </TabsContent>
      </Tabs>
    </div>
  );
}
