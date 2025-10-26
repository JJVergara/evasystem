import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrganization } from "./useCurrentOrganization";
import { toast } from "sonner";

export interface Fiesta {
  id: string;
  name: string;
  description: string | null;
  organization_id: string;
  event_date: string | null;
  location: string | null;
  main_hashtag: string | null;
  secondary_hashtags: string[] | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export function useFiestas() {
  const { organization } = useCurrentOrganization();
  const [fiestas, setFiestas] = useState<Fiesta[]>([]);
  const [selectedFiestaId, setSelectedFiestaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (organization) {
      fetchFiestas();
    }
  }, [organization]);

  const fetchFiestas = async () => {
    if (!organization) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('fiestas')
        .select('id, organization_id, name, description, location, event_date, main_hashtag, secondary_hashtags, instagram_handle, status, created_at, updated_at')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching fiestas:', error);
        toast.error('Error al cargar fiestas');
        return;
      }

      setFiestas(data || []);
      
      // Auto-select first fiesta if none selected
      if (!selectedFiestaId && data && data.length > 0) {
        setSelectedFiestaId(data[0].id);
      }
    } catch (error) {
      console.error('Unexpected error fetching fiestas:', error);
      toast.error('Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  const createFiesta = async (fiestaData: Omit<Fiesta, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) => {
    if (!organization) return null;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('fiestas')
        .insert({
          ...fiestaData,
          organization_id: organization.id
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating fiesta:', error);
        toast.error('Error al crear fiesta');
        return null;
      }

      await fetchFiestas();
      toast.success('Fiesta creada exitosamente');
      return data;
    } catch (error) {
      console.error('Error creating fiesta:', error);
      toast.error('Error inesperado');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateFiesta = async (fiestaId: string, updates: Partial<Fiesta>) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('fiestas')
        .update(updates)
        .eq('id', fiestaId);

      if (error) {
        console.error('Error updating fiesta:', error);
        toast.error('Error al actualizar fiesta');
        return false;
      }

      await fetchFiestas();
      toast.success('Fiesta actualizada');
      return true;
    } catch (error) {
      console.error('Error updating fiesta:', error);
      toast.error('Error inesperado');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const selectedFiesta = fiestas.find(f => f.id === selectedFiestaId) || null;

  return {
    fiestas,
    selectedFiesta,
    selectedFiestaId,
    setSelectedFiestaId,
    loading,
    createFiesta,
    updateFiesta,
    refreshFiestas: fetchFiestas
  };
}