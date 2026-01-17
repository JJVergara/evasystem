import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Copy, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization';
import { toast } from 'sonner';

interface MetaAppCredentialsFormProps {
  isOpen: boolean;
  onClose: () => void;
  onCredentialsSaved: () => void;
}

export function MetaAppCredentialsForm({
  isOpen,
  onClose,
  onCredentialsSaved,
}: MetaAppCredentialsFormProps) {
  const { organization } = useCurrentOrganization();
  const [loading, setLoading] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);
  const [hasCredentials, setHasCredentials] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    metaAppId: '',
    metaAppSecret: '',
    webhookVerifyToken: '',
  });

  const redirectUri = `${window.location.origin}/api/meta-oauth?action=callback`;
  const webhookUrl = `https://awpfslcepylnipaolmvv.supabase.co/functions/v1/instagram-webhook`;

  useEffect(() => {
    if (isOpen && organization) {
      checkCredentialsStatus();
    }
  }, [isOpen, organization]);

  const checkCredentialsStatus = async () => {
    if (!organization) return;

    try {
      const { data, error } = await supabase.rpc('get_org_meta_credentials_status', {
        p_organization_id: organization.id,
      });

      if (error) {
        return;
      }

      if (data && data.length > 0) {
        setHasCredentials(data[0].has_credentials || false);
        setLastUpdated(data[0].updated_at);
      }
    } catch {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;

    if (
      !formData.metaAppId.trim() ||
      !formData.metaAppSecret.trim() ||
      !formData.webhookVerifyToken.trim()
    ) {
      toast.error('Todos los campos son obligatorios');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.rpc('upsert_org_meta_credentials', {
        p_organization_id: organization.id,
        p_meta_app_id: formData.metaAppId.trim(),
        p_meta_app_secret: formData.metaAppSecret.trim(),
        p_webhook_verify_token: formData.webhookVerifyToken.trim(),
      });

      if (error) {
        toast.error('Error al guardar credenciales: ' + error.message);
        return;
      }

      toast.success('Credenciales de Meta guardadas exitosamente');
      onCredentialsSaved();
    } catch {
      toast.error('Error inesperado al guardar credenciales');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado al portapapeles`);
  };

  const generateRandomToken = () => {
    const token = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
    setFormData({ ...formData, webhookVerifyToken: token });
  };

  const handleClose = () => {
    setFormData({
      metaAppId: '',
      metaAppSecret: '',
      webhookVerifyToken: '',
    });
    setShowSecrets(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            Configurar Meta App
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                {hasCredentials ? (
                  <CheckCircle className="h-5 w-5 text-success" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-warning" />
                )}
                Estado de Configuración
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <Badge variant={hasCredentials ? 'default' : 'secondary'}>
                    {hasCredentials ? 'Configurado' : 'Pendiente'}
                  </Badge>
                  {lastUpdated && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Última actualización: {new Date(lastUpdated).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://developers.facebook.com/apps/', '_blank')}
                  className="gap-2 w-full sm:w-auto"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span className="truncate">Ir a Meta Developers</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>URLs para tu Meta App</CardTitle>
              <CardDescription>
                Usa estas URLs exactas al configurar tu aplicación en Meta Developers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Redirect URI (OAuth)</Label>
                <div className="flex flex-col sm:flex-row gap-2 mt-1">
                  <Input
                    value={redirectUri}
                    readOnly
                    className="font-mono text-sm break-all flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(redirectUri, 'Redirect URI')}
                    className="w-full sm:w-auto shrink-0"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Webhook URL</Label>
                <div className="flex flex-col sm:flex-row gap-2 mt-1">
                  <Input
                    value={webhookUrl}
                    readOnly
                    className="font-mono text-sm break-all flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(webhookUrl, 'Webhook URL')}
                    className="w-full sm:w-auto shrink-0"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Credenciales de tu Meta App</CardTitle>
              <CardDescription>
                Ingresa los datos de tu aplicación desde Meta Developers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="metaAppId">App ID *</Label>
                  <Input
                    id="metaAppId"
                    value={formData.metaAppId}
                    onChange={(e) => setFormData({ ...formData, metaAppId: e.target.value })}
                    placeholder="123456789012345"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="metaAppSecret">App Secret *</Label>
                  <div className="relative">
                    <Input
                      id="metaAppSecret"
                      type={showSecrets ? 'text' : 'password'}
                      value={formData.metaAppSecret}
                      onChange={(e) => setFormData({ ...formData, metaAppSecret: e.target.value })}
                      placeholder="abcdef123456789..."
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowSecrets(!showSecrets)}
                    >
                      {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="webhookVerifyToken">Webhook Verify Token *</Label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      id="webhookVerifyToken"
                      type={showSecrets ? 'text' : 'password'}
                      value={formData.webhookVerifyToken}
                      onChange={(e) =>
                        setFormData({ ...formData, webhookVerifyToken: e.target.value })
                      }
                      placeholder="mi_token_secreto_123"
                      required
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={generateRandomToken}
                      size="sm"
                      className="w-full sm:w-auto shrink-0"
                    >
                      Generar
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Úsalo también en la configuración de Webhooks en Meta
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    className="w-full sm:w-auto"
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                    {loading ? 'Guardando...' : hasCredentials ? 'Actualizar' : 'Guardar'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
