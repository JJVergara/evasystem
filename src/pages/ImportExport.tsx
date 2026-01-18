import { PageHeader } from '@/components/Layout/PageHeader';
import { GlassPanel } from '@/components/Layout/GlassPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ImportExportReal from '@/components/ImportExport/ImportExportReal';
import BackupCenter from '@/components/ImportExport/BackupCenter';
import { EMOJIS } from '@/constants';

export default function ImportExport() {
  return (
    <>
      <PageHeader
        title="Centro de Respaldos e Importación"
        description="Gestiona tus datos con herramientas de respaldo, importación y exportación"
        emoji={EMOJIS.navigation.import}
      />

      <GlassPanel>
        <Tabs defaultValue="backup" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="backup">Centro de Respaldos</TabsTrigger>
            <TabsTrigger value="import-export">Importar/Exportar</TabsTrigger>
          </TabsList>

          <TabsContent value="backup">
            <BackupCenter />
          </TabsContent>

          <TabsContent value="import-export">
            <ImportExportReal />
          </TabsContent>
        </Tabs>
      </GlassPanel>
    </>
  );
}
