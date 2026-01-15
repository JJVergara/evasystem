import { useState } from 'react';
import { Check, ChevronDown, Building2, Plus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization';
import { toast } from 'sonner';

export const OrganizationSwitcher = () => {
  const { currentOrganization, userOrganizations, switchOrganization } = useCurrentOrganization();
  const [switching, setSwitching] = useState(false);

  const handleSwitchOrganization = async (organizationId: string) => {
    if (switching || currentOrganization?.organization_id === organizationId) return;

    setSwitching(true);
    try {
      await switchOrganization(organizationId);
      toast.success('Organización cambiada exitosamente');
      // Force page reload to refresh all data
      window.location.reload();
    } catch (error) {
      console.error('Error switching organization:', error);
      toast.error('Error al cambiar de organización');
    } finally {
      setSwitching(false);
    }
  };

  if (!currentOrganization) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between gap-2 h-10"
          disabled={switching}
        >
          <div className="flex items-center gap-2 truncate">
            <Building2 className="w-4 h-4 shrink-0" />
            <span className="truncate">{currentOrganization.organization.name}</span>
            {currentOrganization.is_owner && (
              <Badge variant="secondary" className="text-xs">
                Owner
              </Badge>
            )}
          </div>
          <ChevronDown className="w-4 h-4 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80">
        <DropdownMenuLabel>Cambiar Organización</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {userOrganizations.map((org) => (
          <DropdownMenuItem
            key={org.organization_id}
            onClick={() => handleSwitchOrganization(org.organization_id)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div className="flex items-center gap-2 flex-1">
              <Building2 className="w-4 h-4" />
              <div className="flex-1">
                <div className="font-medium">{org.organization.name}</div>
                <div className="text-sm text-muted-foreground">
                  {org.is_owner ? 'Propietario' : `Rol: ${org.role}`}
                </div>
              </div>
            </div>
            {currentOrganization.organization_id === org.organization_id && (
              <Check className="w-4 h-4" />
            )}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => {
            // Navigate to create organization or settings
            window.location.href = '/profile';
          }}
          className="flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Crear Nueva Organización</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
