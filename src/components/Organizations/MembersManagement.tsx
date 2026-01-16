import { useState, useEffect } from 'react';
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { UserPlus, MoreHorizontal, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface OrganizationMember {
  id: string;
  user_id: string;
  role: string;
  status: string;
  joined_at: string;
  permissions: any;
  user?: {
    email: string;
    name: string;
  };
}

export const MembersManagement = () => {
  const { currentOrganization } = useCurrentOrganization();
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  const fetchMembers = async () => {
    if (!currentOrganization?.organization_id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', currentOrganization.organization_id)
        .eq('status', 'active');

      if (error) throw error;

      const membersWithUsers = await Promise.all(
        (data || []).map(async (member) => {
          const { data: authUser } = await supabase.auth.admin.getUserById(member.user_id);

          return {
            ...member,
            user: {
              email: authUser?.user?.email || '',
              name: authUser?.user?.user_metadata?.name || authUser?.user?.email || 'Usuario',
            },
          };
        })
      );

      setMembers(membersWithUsers);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast.error('Error al cargar miembros');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteMember = async () => {
    if (!currentOrganization?.organization_id || !inviteEmail.trim()) return;

    try {
      const { data: userQuery, error: userError } = await supabase
        .from('users')
        .select('auth_user_id')
        .eq('email', inviteEmail)
        .single();

      if (userError || !userQuery) {
        toast.error('Usuario no encontrado. El usuario debe registrarse primero.');
        return;
      }

      const existingUserId = userQuery.auth_user_id;

      const { data: existingMember } = await supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', currentOrganization.organization_id)
        .eq('user_id', existingUserId)
        .single();

      if (existingMember) {
        toast.error('El usuario ya es miembro de esta organización');
        return;
      }

      const { error: memberError } = await supabase.from('organization_members').insert({
        organization_id: currentOrganization.organization_id,
        user_id: existingUserId,
        role: inviteRole,
        status: 'active',
        permissions: {
          manage_ambassadors: true,
          manage_events: true,
          manage_instagram: inviteRole === 'owner',
          view_analytics: true,
          manage_members: inviteRole === 'owner',
        },
      });

      if (memberError) throw memberError;

      toast.success('Miembro invitado exitosamente');
      setInviteEmail('');
      setInviteRole('member');
      setInviteDialogOpen(false);
      fetchMembers();
    } catch (error) {
      console.error('Error inviting member:', error);
      toast.error('Error al invitar miembro');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const { error } = await supabase.from('organization_members').delete().eq('id', memberId);

      if (error) throw error;

      toast.success('Miembro removido exitosamente');
      fetchMembers();
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Error al remover miembro');
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [currentOrganization?.organization_id]);

  if (!currentOrganization?.is_owner) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Miembros</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Solo los propietarios pueden gestionar miembros de la organización.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Miembros de la Organización</CardTitle>

        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              Invitar Miembro
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invitar Nuevo Miembro</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="invite-email">Email del Usuario</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="usuario@ejemplo.com"
                />
              </div>
              <div>
                <Label htmlFor="invite-role">Rol</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Miembro</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleInviteMember} className="w-full">
                Enviar Invitación
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Fecha de Ingreso</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{member.user?.name}</div>
                    <div className="text-sm text-muted-foreground">{member.user?.email}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={member.role === 'owner' ? 'default' : 'secondary'}>
                    {member.role === 'owner'
                      ? 'Propietario'
                      : member.role === 'admin'
                        ? 'Administrador'
                        : 'Miembro'}
                  </Badge>
                </TableCell>
                <TableCell>{new Date(member.joined_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {member.status === 'active' ? 'Activo' : member.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {member.role !== 'owner' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleRemoveMember(member.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remover Miembro
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {members.length === 0 && !loading && (
          <div className="text-center py-8 text-muted-foreground">
            No hay miembros en esta organización
          </div>
        )}
      </CardContent>
    </Card>
  );
};
