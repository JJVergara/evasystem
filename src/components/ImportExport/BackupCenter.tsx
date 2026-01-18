import { useState, useEffect } from 'react';
import { GlassPanel } from '@/components/Layout/GlassPanel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { EMOJIS } from '@/constants';
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization';
import { supabase } from '@/integrations/supabase/client';

interface BackupLog {
  id: string;
  type: string;
  file_name: string;
  status: string;
  created_at: string;
  result_json: any;
  organization_id: string;
  user_id: string;
  source: string;
}

export default function BackupCenter() {
  const { organization } = useCurrentOrganization();
  const [isProcessing, setIsProcessing] = useState(false);
  const [backupLogs, setBackupLogs] = useState<BackupLog[]>([]);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [restoreOptions, setRestoreOptions] = useState({
    overwriteExisting: false,
    selectiveTables: [] as string[],
  });

  const availableTables = [
    'organizations',
    'embassadors',
    'fiestas',
    'events',
    'tasks',
    'leaderboards',
    'organization_settings',
    'notifications',
  ];

  useEffect(() => {
    fetchBackupLogs();
  }, []);

  const fetchBackupLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('import_logs')
        .select(
          'id, user_id, organization_id, type, source, file_name, status, result_json, created_at'
        )
        .in('type', ['backup', 'export', 'restore'])
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setBackupLogs(data || []);
    } catch {}
  };

  const createFullBackup = async () => {
    if (!organization) {
      toast.error('No se encontró la organización');
      return;
    }

    try {
      setIsProcessing(true);
      setProgress(10);

      const { data, error } = await supabase.functions.invoke('backup-full-database', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      setProgress(50);

      if (error) throw error;

      setProgress(80);

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `eva-backup-full-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setProgress(100);
      toast.success('Respaldo completo creado y descargado exitosamente');
      fetchBackupLogs();
    } catch {
      toast.error('Error al crear el respaldo');
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const exportOrganizationData = async (format: 'json' | 'csv' = 'json') => {
    if (!organization) {
      toast.error('No se encontró la organización');
      return;
    }

    try {
      setIsProcessing(true);
      setProgress(10);

      const { data, error } = await supabase.functions.invoke('export-organization-data', {
        body: {
          organizationId: organization.id,
          format,
          tables: 'all',
        },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      setProgress(50);

      if (error) throw error;

      setProgress(80);

      const blob = new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2)], {
        type: format === 'csv' ? 'text/csv' : 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `eva-export-${organization.name}-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setProgress(100);
      toast.success(`Exportación ${format.toUpperCase()} completada exitosamente`);
      fetchBackupLogs();
    } catch {
      toast.error('Error al exportar los datos');
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const restoreFromBackup = async () => {
    if (!selectedFile) {
      toast.error('Selecciona un archivo de respaldo');
      return;
    }

    try {
      setIsProcessing(true);
      setProgress(10);

      const fileContent = await selectedFile.text();
      const backupData = JSON.parse(fileContent);

      setProgress(30);

      const { data, error } = await supabase.functions.invoke('restore-organization-data', {
        body: {
          backupData,
          options: restoreOptions,
        },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      setProgress(80);

      if (error) throw error;

      setProgress(100);

      if (data.success) {
        toast.success(`Restauración completada: ${data.summary}`);
        if (data.errors && data.errors.length > 0) {
          toast.warning(`Advertencias: ${data.errors.length} errores encontrados`);
        }
      } else {
        toast.error(`Error en la restauración: ${data.error}`);
      }

      fetchBackupLogs();
    } catch {
      toast.error('Error al restaurar el respaldo');
    } finally {
      setIsProcessing(false);
      setProgress(0);
      setSelectedFile(null);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const toggleTable = (table: string, checked: boolean) => {
    setRestoreOptions((prev) => ({
      ...prev,
      selectiveTables: checked
        ? [...prev.selectiveTables, table]
        : prev.selectiveTables.filter((t) => t !== table),
    }));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="text-success">{EMOJIS.status.success}</span>;
      case 'failed':
        return <span className="text-destructive">{EMOJIS.status.error}</span>;
      case 'partial':
        return <span className="text-warning">{EMOJIS.status.warning}</span>;
      default:
        return <span className="text-muted-foreground">{EMOJIS.status.pending}</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      completed: 'default',
      failed: 'destructive',
      partial: 'outline',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Centro de Respaldos</h3>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportOrganizationData('csv')}>
            <span className="mr-2">{EMOJIS.actions.download}</span>
            Exportar CSV
          </Button>
          <Button onClick={createFullBackup} disabled={isProcessing}>
            <span className="mr-2">{EMOJIS.entities.database}</span>
            Respaldo Completo
          </Button>
        </div>
      </div>

      {isProcessing && (
        <GlassPanel size="sm">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Procesando...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        </GlassPanel>
      )}

      <Tabs defaultValue="backup" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="backup">Crear Respaldo</TabsTrigger>
          <TabsTrigger value="restore">Restaurar</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="backup" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <GlassPanel size="sm">
              <div className="flex items-center gap-2 mb-4">
                <span>{EMOJIS.entities.database}</span>
                <h4 className="font-semibold">Respaldo Completo</h4>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Crea un respaldo completo de todos los datos de tu organización incluyendo
                embajadores, eventos, tareas y configuraciones.
              </p>
              <Button onClick={createFullBackup} disabled={isProcessing} className="w-full">
                <span className="mr-2">{EMOJIS.entities.database}</span>
                Crear Respaldo Completo
              </Button>
            </GlassPanel>

            <GlassPanel size="sm">
              <div className="flex items-center gap-2 mb-4">
                <span>{EMOJIS.entities.file}</span>
                <h4 className="font-semibold">Exportación Selectiva</h4>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Exporta datos específicos de tu organización en diferentes formatos.
              </p>
              <div className="space-y-2">
                <Button
                  onClick={() => exportOrganizationData('json')}
                  disabled={isProcessing}
                  variant="outline"
                  className="w-full"
                >
                  <span className="mr-2">{EMOJIS.actions.download}</span>
                  Exportar JSON
                </Button>
                <Button
                  onClick={() => exportOrganizationData('csv')}
                  disabled={isProcessing}
                  variant="outline"
                  className="w-full"
                >
                  <span className="mr-2">{EMOJIS.actions.download}</span>
                  Exportar CSV
                </Button>
              </div>
            </GlassPanel>
          </div>
        </TabsContent>

        <TabsContent value="restore" className="space-y-6">
          <GlassPanel>
            <div className="flex items-center gap-2 mb-6">
              <span>{EMOJIS.actions.upload}</span>
              <h4 className="font-semibold">Restaurar desde Respaldo</h4>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Archivo de Respaldo</Label>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 mt-2"
                />
                {selectedFile && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Seleccionado: {selectedFile.name}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="overwrite"
                    checked={restoreOptions.overwriteExisting}
                    onCheckedChange={(checked) =>
                      setRestoreOptions((prev) => ({
                        ...prev,
                        overwriteExisting: checked as boolean,
                      }))
                    }
                  />
                  <Label htmlFor="overwrite" className="text-sm">
                    Sobrescribir datos existentes
                  </Label>
                </div>

                <div>
                  <Label className="text-sm font-medium">
                    Tablas a restaurar (dejar vacío para todas)
                  </Label>
                  <div className="grid grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto bg-card/30 rounded-lg p-3">
                    {availableTables.map((table) => (
                      <div key={table} className="flex items-center space-x-2">
                        <Checkbox
                          id={table}
                          checked={restoreOptions.selectiveTables.includes(table)}
                          onCheckedChange={(checked) => toggleTable(table, checked as boolean)}
                        />
                        <Label htmlFor={table} className="text-sm font-normal">
                          {table}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5">{EMOJIS.status.warning}</span>
                  <div>
                    <h4 className="font-medium">Advertencia</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      La restauración puede sobrescribir datos existentes. Asegúrate de tener un
                      respaldo actual antes de proceder.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={restoreFromBackup}
                disabled={isProcessing || !selectedFile}
                className="w-full"
              >
                <span className="mr-2">{EMOJIS.actions.upload}</span>
                Restaurar Datos
              </Button>
            </div>
          </GlassPanel>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <GlassPanel>
            <div className="flex items-center gap-2 mb-6">
              <span>{EMOJIS.entities.timer}</span>
              <h4 className="font-semibold">Historial de Operaciones</h4>
            </div>

            <div className="space-y-4">
              {backupLogs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No se encontraron operaciones de respaldo
                </p>
              ) : (
                backupLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-4 bg-card/30 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(log.status)}
                      <div>
                        <p className="font-medium">{log.file_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {log.type} • {new Date(log.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(log.status)}
                      {log.result_json?.record_counts &&
                        typeof log.result_json.record_counts === 'object' && (
                          <Badge variant="outline">
                            {Object.values(
                              log.result_json.record_counts as Record<string, number>
                            ).reduce((a: number, b: number) => a + b, 0)}{' '}
                            registros
                          </Badge>
                        )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassPanel>
        </TabsContent>
      </Tabs>
    </div>
  );
}
