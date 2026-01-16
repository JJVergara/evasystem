import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { User, Mail, Building2, Calendar, Save, Edit } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface UserData {
  id: string;
  name: string;
  email: string;
  organization_id: string;
  created_at: string;
  organization?: {
    name: string;
  };
}

export default function UserProfile() {
  const { user } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      if (!user) return;

      const { data: userRecord, error } = await supabase
        .from('users')
        .select(
          `
          id,
          name,
          email,
          organization_id,
          created_at
        `
        )
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (userRecord) {
        let organizationData = null;
        if (userRecord.organization_id) {
          const { data: orgInfo } = await supabase.rpc('get_organization_safe_info', {
            org_id: userRecord.organization_id,
          });
          organizationData = orgInfo?.[0] || null;
        }

        const userData = {
          ...userRecord,
          organization: organizationData ? { name: organizationData.name } : null,
        };

        setUserData(userData);
        setFormData({
          name: userRecord.name,
          email: userRecord.email,
        });
      }
    } catch (error) {
      void ('Error fetching user data:', error);
      toast.error('Error al cargar datos del usuario');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!userData) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('users')
        .update({
          name: formData.name,
          email: formData.email,
        })
        .eq('id', userData.id);

      if (error) throw error;

      setUserData((prev) => (prev ? { ...prev, ...formData } : null));
      setIsEditing(false);
      toast.success('Perfil actualizado correctamente');
    } catch (error) {
      void ('Error updating profile:', error);
      toast.error('Error al actualizar perfil');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">
              <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No se pudo cargar la información del usuario</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gradient">Mi Perfil</h1>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)}>
            <Edit className="w-4 h-4 mr-2" />
            Editar Perfil
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Información Personal
            </CardTitle>
            <CardDescription>Gestiona tu información personal y de contacto</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src="" />
                <AvatarFallback className="text-lg">
                  {userData.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-medium">{userData.name}</h3>
                <p className="text-muted-foreground">{userData.email}</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre Completo</Label>
                {isEditing ? (
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                ) : (
                  <p className="mt-1 text-sm">{userData.name}</p>
                )}
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                {isEditing ? (
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                ) : (
                  <p className="mt-1 text-sm flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {userData.email}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Información de Organización
            </CardTitle>
            <CardDescription>Detalles de tu organización y cuenta</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Organización</Label>
              <p className="mt-1 text-sm flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {userData.organization?.name || 'Sin organización'}
              </p>
            </div>

            <div>
              <Label>Estado de la Cuenta</Label>
              <div className="mt-1">
                <Badge variant="default">Activa</Badge>
              </div>
            </div>

            <div>
              <Label>Miembro desde</Label>
              <p className="mt-1 text-sm flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {formatDistanceToNow(new Date(userData.created_at), {
                  locale: es,
                  addSuffix: true,
                })}
              </p>
            </div>

            <Separator />

            <div className="text-sm text-muted-foreground">
              <p>Tu información está protegida y solo es visible para tu organización.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
