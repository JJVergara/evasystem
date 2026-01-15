import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCurrentOrganization } from './useCurrentOrganization';
import { supabase } from '@/integrations/supabase/client';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  required: boolean; // true = obligatorio, false = recomendado
}

interface OnboardingData {
  steps: OnboardingStep[];
  overallProgress: number;
  canAccessDashboard: boolean;
}

interface OrganizationData {
  id: string;
  name: string;
  instagram_business_account_id?: string;
}

const defaultSteps: OnboardingStep[] = [
  {
    id: 'organization',
    title: 'Crear Organización',
    description: 'Configura tu productora de eventos',
    completed: false,
    required: true,
  },
  {
    id: 'instagram',
    title: 'Conectar Instagram (Opcional)',
    description: 'Vincula tu cuenta business de Instagram',
    completed: false,
    required: false,
  },
  {
    id: 'fiesta',
    title: 'Crear Primera Fiesta (Opcional)',
    description: 'Configura tu primer evento',
    completed: false,
    required: false,
  },
  {
    id: 'ambassadors',
    title: 'Añadir Embajadores (Opcional)',
    description: 'Invita a tus primeros embajadores',
    completed: false,
    required: false,
  },
];

async function fetchOnboardingData(organization: OrganizationData | null): Promise<OnboardingData> {
  if (!organization) {
    return {
      steps: defaultSteps,
      overallProgress: 0,
      canAccessDashboard: false,
    };
  }

  // Verificar el estado de cada paso
  const orgCompleted = organization.name !== 'Mi Organización';

  // Verificar Instagram - check multiple indicators
  let instagramCompleted = false;
  try {
    // Method 1: Check if organization has Instagram business account linked
    if (organization.instagram_business_account_id) {
      instagramCompleted = true;
    }

    // Method 2: If not found via org data, check token status directly
    if (!instagramCompleted) {
      const { data: tokenStatus } = await supabase.functions.invoke('instagram-token-status');
      if (tokenStatus?.success && tokenStatus?.data?.isConnected) {
        instagramCompleted = true;
      }
    }

    // Method 3: Check if there's a valid token in the tokens table
    if (!instagramCompleted) {
      const { data: tokenData } = await supabase
        .from('organization_instagram_tokens')
        .select('id, token_expiry')
        .eq('organization_id', organization.id)
        .maybeSingle();

      if (tokenData && tokenData.token_expiry) {
        const expiryDate = new Date(tokenData.token_expiry);
        instagramCompleted = expiryDate > new Date();
      }
    }
  } catch (error) {
    console.error('Error checking Instagram status:', error);
  }

  // Verificar fiestas
  let fiestaCompleted = false;
  try {
    const { data: fiestas, error } = await supabase
      .from('fiestas')
      .select('id')
      .eq('organization_id', organization.id)
      .limit(1);

    fiestaCompleted = !error && (fiestas?.length || 0) > 0;
  } catch (error) {
    console.error('Error checking fiestas:', error);
  }

  // Verificar embajadores
  let ambassadorsCompleted = false;
  try {
    const { data: ambassadors, error } = await supabase
      .from('embassadors')
      .select('id')
      .eq('organization_id', organization.id)
      .limit(1);

    ambassadorsCompleted = !error && (ambassadors?.length || 0) > 0;
  } catch (error) {
    console.error('Error checking ambassadors:', error);
  }

  const steps: OnboardingStep[] = [
    {
      id: 'organization',
      title: 'Organización Lista',
      description: 'Configura tu productora de eventos',
      completed: orgCompleted,
      required: true,
    },
    {
      id: 'instagram',
      title: 'Conectar Instagram (Opcional)',
      description: 'Vincula tu cuenta business de Instagram',
      completed: instagramCompleted,
      required: false,
    },
    {
      id: 'fiesta',
      title: 'Crear Primera Fiesta (Opcional)',
      description: 'Configura tu primer evento',
      completed: fiestaCompleted,
      required: false,
    },
    {
      id: 'ambassadors',
      title: 'Añadir Embajadores (Opcional)',
      description: 'Invita a tus primeros embajadores',
      completed: ambassadorsCompleted,
      required: false,
    },
  ];

  // Calcular progreso
  const completedSteps = steps.filter((step) => step.completed).length;
  const overallProgress = (completedSteps / steps.length) * 100;

  // Puede acceder al dashboard si completó los pasos obligatorios
  const canAccessDashboard = steps.filter((step) => step.required).every((step) => step.completed);

  return {
    steps,
    overallProgress,
    canAccessDashboard,
  };
}

export function useOnboardingStatus() {
  const { organization, loading: orgLoading } = useCurrentOrganization();
  const queryClient = useQueryClient();

  const queryKey = ['onboardingStatus', organization?.id];

  const { data, isLoading: onboardingLoading } = useQuery({
    queryKey,
    queryFn: () => fetchOnboardingData(organization),
    enabled: !orgLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes cache
  });

  const refreshOnboardingStatus = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  const loading = orgLoading || onboardingLoading;

  return {
    steps: data?.steps || defaultSteps,
    overallProgress: data?.overallProgress || 0,
    canAccessDashboard: data?.canAccessDashboard || false,
    loading,
    refreshOnboardingStatus,
  };
}
