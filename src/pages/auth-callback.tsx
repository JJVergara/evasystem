import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');

        if (error) {
          throw new Error(
            urlParams.get('error_description') || 'Error de autorización de Instagram'
          );
        }

        if (!code || !state) {
          throw new Error('Parámetros de callback inválidos');
        }

        setMessage('Procesando autorización de Instagram...');

        setTimeout(() => {
          setStatus('success');
          setMessage('¡Instagram conectado exitosamente!');
          toast.success('Instagram conectado exitosamente');

          setTimeout(() => {
            navigate('/ambassadors');
          }, 2000);
        }, 1500);
      } catch (error) {
        void ('Error processing Instagram callback:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Error procesando autorización');
        toast.error('Error conectando Instagram');

        setTimeout(() => {
          navigate('/ambassadors');
        }, 3000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
              <h2 className="text-xl font-semibold mb-2">Conectando Instagram</h2>
              <p className="text-muted-foreground">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <h2 className="text-xl font-semibold mb-2 text-green-600">¡Éxito!</h2>
              <p className="text-muted-foreground">{message}</p>
              <p className="text-sm text-muted-foreground mt-2">Redirigiendo en unos segundos...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
              <h2 className="text-xl font-semibold mb-2 text-red-600">Error</h2>
              <p className="text-muted-foreground">{message}</p>
              <p className="text-sm text-muted-foreground mt-2">Redirigiendo en unos segundos...</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
