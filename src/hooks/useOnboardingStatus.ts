
import { useState, useEffect } from "react";
import { useCurrentOrganization } from "./useCurrentOrganization";
import { supabase } from "@/integrations/supabase/client";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  required: boolean; // true = obligatorio, false = recomendado
}

export function useOnboardingStatus() {
  const { organization, loading } = useCurrentOrganization();
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [canAccessDashboard, setCanAccessDashboard] = useState(false);

  useEffect(() => {
    if (loading) return;
    
    checkOnboardingStatus();
  }, [organization, loading]);

  const checkOnboardingStatus = async () => {
    if (!organization) {
      // No hay organización, el usuario necesita crearla
      const initialSteps: OnboardingStep[] = [
        {
          id: "organization",
          title: "Crear Organización",
          description: "Configura tu productora de eventos",
          completed: false,
          required: true
        },
        {
          id: "instagram",
          title: "Conectar Instagram (Opcional)",
          description: "Vincula tu cuenta business de Instagram",
          completed: false,
          required: false
        },
        {
          id: "fiesta",
          title: "Crear Primera Fiesta (Opcional)",
          description: "Configura tu primer evento",
          completed: false,
          required: false
        },
        {
          id: "ambassadors",
          title: "Añadir Embajadores (Opcional)",
          description: "Invita a tus primeros embajadores",
          completed: false,
          required: false
        }
      ];
      
      setSteps(initialSteps);
      setOverallProgress(0);
      setCanAccessDashboard(false);
      return;
    }

    // Verificar el estado de cada paso
    const orgCompleted = organization.name !== "Mi Organización";
    
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

    const updatedSteps: OnboardingStep[] = [
      {
        id: "organization",
        title: "Organización Lista",
        description: "Configura tu productora de eventos",
        completed: orgCompleted,
        required: true
      },
      {
        id: "instagram",
        title: "Conectar Instagram (Opcional)",
        description: "Vincula tu cuenta business de Instagram",
        completed: instagramCompleted,
        required: false
      },
      {
        id: "fiesta",
        title: "Crear Primera Fiesta (Opcional)",
        description: "Configura tu primer evento",
        completed: fiestaCompleted,
        required: false
      },
      {
        id: "ambassadors",
        title: "Añadir Embajadores (Opcional)",
        description: "Invita a tus primeros embajadores",
        completed: ambassadorsCompleted,
        required: false
      }
    ];

    setSteps(updatedSteps);
    
    // Calcular progreso
    const completedSteps = updatedSteps.filter(step => step.completed).length;
    const progress = (completedSteps / updatedSteps.length) * 100;
    setOverallProgress(progress);
    
    // Puede acceder al dashboard si completó los pasos obligatorios
    const requiredStepsCompleted = updatedSteps
      .filter(step => step.required)
      .every(step => step.completed);
    
    setCanAccessDashboard(requiredStepsCompleted);
  };

  const refreshOnboardingStatus = () => {
    checkOnboardingStatus();
  };

  return {
    steps,
    overallProgress,
    canAccessDashboard,
    loading,
    refreshOnboardingStatus
  };
}
