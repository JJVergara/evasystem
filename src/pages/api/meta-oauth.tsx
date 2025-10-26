import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// This component acts as a proxy for Meta OAuth callbacks
// It receives the callback from Meta and forwards it to the Supabase edge function
const MetaOAuthProxy = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorDetails, setErrorDetails] = useState<string>('');

  useEffect(() => {
    const handleCallback = async () => {
      const action = searchParams.get('action');
      
      if (action === 'callback' || action === 'refresh') {
        // Extract all URL parameters from the callback
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const errorCode = searchParams.get('error_code');
        const errorMessage = searchParams.get('error_message');

        console.log('=== META OAUTH PROXY DEBUG ===');
        console.log('Callback received:', {
          action,
          code: !!code,
          state: !!state,
          error,
          errorCode,
          errorMessage,
          fullUrl: window.location.href
        });

        // Handle Meta errors first
        if (error) {
          console.error('Meta OAuth error:', { error, errorCode, errorMessage });
          const errorMsg = errorMessage || `Meta OAuth error: ${error}`;
          setStatus('error');
          setErrorDetails(errorMsg);
          toast.error(errorMsg);
          setTimeout(() => navigate('/settings?tab=instagram&status=error&error=' + encodeURIComponent(errorMsg)), 2000);
          return;
        }

        // Validate required parameters
        if (!code || !state) {
          const missingMsg = `Missing required parameters: ${!code ? 'code' : ''} ${!state ? 'state' : ''}`.trim();
          console.error('Missing OAuth parameters:', { code: !!code, state: !!state });
          setStatus('error');
          setErrorDetails(missingMsg);
          toast.error(missingMsg);
          setTimeout(() => navigate('/settings?tab=instagram&status=error&error=' + encodeURIComponent(missingMsg)), 2000);
          return;
        }

        try {
          console.log('Invoking edge function with callback data...');
          
          // Use supabase.functions.invoke to call the edge function
          const { data, error: functionError } = await supabase.functions.invoke('meta-oauth?action=callback', {
            body: {
              action: 'callback',
              code,
              state,
              error,
              error_code: errorCode,
              error_message: errorMessage
            }
          });

          console.log('Edge function response:', { data, error: functionError });

          if (functionError) {
            console.error('Edge function error:', functionError);
            const errorMsg = functionError.message || 'Error en la función de autenticación';
            setStatus('error');
            setErrorDetails(errorMsg);
            toast.error('Error al conectar Instagram: ' + errorMsg);
            setTimeout(() => navigate('/settings?tab=instagram&status=error&error=' + encodeURIComponent(errorMsg)), 2000);
          } else if (data?.success === false || data?.error) {
            console.error('Callback processing error:', data);
            
            // Show specific error messages based on error type
            let userFriendlyMsg = 'Error procesando la autorización';
            if (data?.error === 'meta_api_error') {
              userFriendlyMsg = 'Error de configuración de Meta/Facebook. Verifica las credenciales de tu aplicación Meta.';
            } else if (data?.error === 'token_processing_error') {
              userFriendlyMsg = 'Error procesando datos de Meta. Intenta reconectar en unos minutos.';
            } else if (data?.error === 'database_error') {
              userFriendlyMsg = 'Error guardando la conexión. Contacta al soporte técnico.';
            } else if (data?.error_description) {
              userFriendlyMsg = data.error_description;
            }
            
            setStatus('error');
            setErrorDetails(`${userFriendlyMsg} ${data?.debug_info ? `(Debug: ${data.debug_info})` : ''}`);
            toast.error(`Error al conectar Instagram: ${userFriendlyMsg}`);
            setTimeout(() => navigate('/settings?tab=instagram&status=error&error=' + encodeURIComponent(userFriendlyMsg)), 2000);
          } else if (data?.success === true) {
            console.log('Instagram connection successful!');
            setStatus('success');
            toast.success('Instagram conectado exitosamente');
            setTimeout(() => navigate('/settings?tab=instagram&status=success'), 1000);
          } else {
            // Fallback for unexpected response format
            console.warn('Unexpected response format:', data);
            const errorMsg = 'Respuesta inesperada del servidor';
            setStatus('error');
            setErrorDetails(errorMsg);
            toast.error('Error al conectar Instagram: ' + errorMsg);
            setTimeout(() => navigate('/settings?tab=instagram&status=error&error=' + encodeURIComponent(errorMsg)), 2000);
          }
        } catch (error) {
          console.error('=== PROXY EXCEPTION ===');
          console.error('Proxy error:', error);
          const errorMsg = error instanceof Error ? error.message : 'Error inesperado en la conexión';
          setStatus('error');
          setErrorDetails(errorMsg);
          toast.error('Error en la conexión: ' + errorMsg);
          setTimeout(() => navigate('/settings?tab=instagram&status=error&error=' + encodeURIComponent(errorMsg)), 2000);
        }
      } else {
        console.log('Not a callback action, redirecting to settings');
        navigate('/settings');
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <div className="text-center max-w-md mx-auto p-6">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg font-medium mb-2">Procesando conexión de Instagram...</p>
            <p className="text-sm text-muted-foreground">Esto puede tomar unos segundos</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-lg font-medium text-green-600 mb-2">¡Conexión exitosa!</p>
            <p className="text-sm text-muted-foreground">Redirigiendo a configuraciones...</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-lg font-medium text-red-600 mb-2">Error en la conexión</p>
            <p className="text-sm text-muted-foreground mb-4">{errorDetails}</p>
            <p className="text-xs text-muted-foreground">Redirigiendo a configuraciones...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default MetaOAuthProxy;