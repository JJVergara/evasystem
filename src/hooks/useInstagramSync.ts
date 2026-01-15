import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrganization } from './useCurrentOrganization';
import { toast } from 'sonner';

export function useInstagramSync() {
  const { organization } = useCurrentOrganization();
  const [isSyncing, setIsSyncing] = useState(false);

  const syncInstagramData = async () => {
    if (!organization?.id) {
      toast.error('No se encontró organización');
      return false;
    }

    try {
      setIsSyncing(true);

      const { data, error } = await supabase.functions.invoke('instagram-sync', {
        body: { organization_id: organization.id },
      });

      if (error) {
        console.error('Error syncing Instagram data:', error);
        toast.error('Error al sincronizar datos de Instagram');
        return false;
      }

      if (data?.success) {
        const totalProcessed = data.totalProcessed || 0;
        const newMentions =
          data.results?.reduce(
            (sum: number, r: { newMentions?: number }) => sum + (r.newMentions || 0),
            0
          ) || 0;
        const newTags =
          data.results?.reduce(
            (sum: number, r: { newTags?: number }) => sum + (r.newTags || 0),
            0
          ) || 0;

        if (newMentions > 0 || newTags > 0) {
          toast.success(
            `Sincronización completada: ${newMentions} menciones, ${newTags} etiquetas detectadas`
          );
        } else {
          toast.success('Datos de Instagram sincronizados correctamente');
        }
        return true;
      } else {
        toast.error('Error en la sincronización');
        return false;
      }
    } catch (error) {
      console.error('Error syncing Instagram:', error);
      toast.error('Error inesperado al sincronizar');
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  // Nuevas funciones según especificaciones del usuario
  const getInstagramProfile = async () => {
    if (!organization?.id) {
      toast.error('No se encontró organización');
      return null;
    }

    try {
      setIsSyncing(true);

      const { data, error } = await supabase.functions.invoke('instagram-profile', {
        body: {
          organization_id: organization.id,
          endpoint: 'profile',
        },
      });

      if (error) {
        console.error('Error getting Instagram profile:', error);
        toast.error('Error al obtener perfil de Instagram');
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting Instagram profile:', error);
      toast.error('Error inesperado al obtener perfil');
      return null;
    } finally {
      setIsSyncing(false);
    }
  };

  const getInstagramMedia = async () => {
    if (!organization?.id) {
      toast.error('No se encontró organización');
      return null;
    }

    try {
      setIsSyncing(true);

      const { data, error } = await supabase.functions.invoke('instagram-profile', {
        body: {
          organization_id: organization.id,
          endpoint: 'media',
        },
      });

      if (error) {
        console.error('Error getting Instagram media:', error);
        toast.error('Error al obtener feed de Instagram');
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting Instagram media:', error);
      toast.error('Error inesperado al obtener feed');
      return null;
    } finally {
      setIsSyncing(false);
    }
  };

  const getInstagramTags = async () => {
    if (!organization?.id) {
      toast.error('No se encontró organización');
      return null;
    }

    try {
      setIsSyncing(true);

      const { data, error } = await supabase.functions.invoke('instagram-profile', {
        body: {
          organization_id: organization.id,
          endpoint: 'tags',
        },
      });

      if (error) {
        console.error('Error getting Instagram tags:', error);
        toast.error('Error al obtener menciones de Instagram');
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting Instagram tags:', error);
      toast.error('Error inesperado al obtener menciones');
      return null;
    } finally {
      setIsSyncing(false);
    }
  };

  const refreshToken = async () => {
    if (!organization?.id) {
      toast.error('No se encontró organización');
      return false;
    }

    try {
      setIsSyncing(true);

      const { data, error } = await supabase.functions.invoke('meta-oauth?action=refresh', {
        body: { organization_id: organization.id },
      });

      if (error) {
        console.error('Error refreshing token:', error);
        toast.error('Error al renovar token de Instagram');
        return false;
      }

      if (data?.success) {
        toast.success('Token de Instagram renovado correctamente');
        return true;
      } else {
        toast.error('Error al renovar token');
        return false;
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      toast.error('Error inesperado al renovar token');
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    isSyncing,
    syncInstagramData,
    refreshToken,
    getInstagramProfile,
    getInstagramMedia,
    getInstagramTags,
  };
}
