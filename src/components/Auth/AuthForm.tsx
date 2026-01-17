import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Instagram, BarChart3, Users, Zap, Shield } from 'lucide-react';
import { ModernLogo } from '@/components/Logo/ModernLogo';

export function AuthForm() {
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>, mode: 'signin' | 'signup') => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const { error } =
        mode === 'signin' ? await signIn(email, password) : await signUp(email, password);

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      } else if (mode === 'signup') {
        toast({
          title: '¡Cuenta creada!',
          description: 'Revisa tu email para confirmar tu cuenta.',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Algo salió mal. Inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-16">
          <div className="flex flex-col items-center space-y-8 text-center lg:flex-1">
            <div className="animate-fade-in">
              <ModernLogo size="xl" className="animate-scale-in" />
            </div>

            <div className="space-y-4 animate-fade-in">
              <h1 className="text-4xl lg:text-6xl font-bold text-foreground">EVA System</h1>
              <p className="text-xl lg:text-2xl text-muted-foreground max-w-2xl leading-relaxed">
                Gestiona tu equipo de embajadores de Instagram con
                <span className="text-primary font-semibold"> inteligencia artificial</span>
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left max-w-3xl animate-fade-in">
              <div className="group p-4 rounded-2xl bg-card border border-border hover:shadow-card transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Instagram className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">Integración Instagram</h3>
                <p className="text-sm text-muted-foreground">Conexión directa y segura</p>
              </div>

              <div className="group p-4 rounded-2xl bg-card border border-border hover:shadow-card transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-info flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-6 h-6 text-info-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">Analíticas IA</h3>
                <p className="text-sm text-muted-foreground">Insights en tiempo real</p>
              </div>

              <div className="group p-4 rounded-2xl bg-card border border-border hover:shadow-card transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-success flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6 text-success-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">Gestión Inteligente</h3>
                <p className="text-sm text-muted-foreground">Embajadores y eventos</p>
              </div>
            </div>
          </div>

          <div className="w-full max-w-md lg:flex-none animate-fade-in">
            <div className="bg-card rounded-3xl shadow-elegant border border-border p-8">
              <div className="text-center mb-8 lg:hidden">
                <ModernLogo size="lg" className="mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-foreground mb-2">EVA System</h2>
                <p className="text-muted-foreground">Tu plataforma de embajadores IA</p>
              </div>

              <Tabs defaultValue="signin" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-muted rounded-xl p-1">
                  <TabsTrigger
                    value="signin"
                    className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm transition-all"
                  >
                    Iniciar Sesión
                  </TabsTrigger>
                  <TabsTrigger
                    value="signup"
                    className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm transition-all"
                  >
                    Registrarse
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="signin" className="mt-6">
                  <div className="space-y-6">
                    <div className="text-center space-y-2">
                      <h3 className="text-2xl font-bold text-foreground">Bienvenido de vuelta</h3>
                      <p className="text-muted-foreground">
                        Ingresa tus credenciales para continuar
                      </p>
                    </div>

                    <form onSubmit={(e) => handleSubmit(e, 'signin')} className="space-y-5">
                      <div className="space-y-2">
                        <Label htmlFor="signin-email" className="text-foreground font-medium">
                          Email
                        </Label>
                        <Input
                          id="signin-email"
                          name="email"
                          type="email"
                          placeholder="tu@email.com"
                          className="h-12 rounded-lg"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signin-password" className="text-foreground font-medium">
                          Contraseña
                        </Label>
                        <Input
                          id="signin-password"
                          name="password"
                          type="password"
                          placeholder="••••••••"
                          className="h-12 rounded-lg"
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full h-12 rounded-lg" disabled={isLoading}>
                        {isLoading ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Iniciando sesión...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4" />
                            Iniciar Sesión
                          </div>
                        )}
                      </Button>
                    </form>
                  </div>
                </TabsContent>

                <TabsContent value="signup" className="mt-6">
                  <div className="space-y-6">
                    <div className="text-center space-y-2">
                      <h3 className="text-2xl font-bold text-foreground">Crear cuenta</h3>
                      <p className="text-muted-foreground">
                        Únete a EVA System y comienza tu transformación digital
                      </p>
                    </div>

                    <form onSubmit={(e) => handleSubmit(e, 'signup')} className="space-y-5">
                      <div className="space-y-2">
                        <Label htmlFor="signup-email" className="text-foreground font-medium">
                          Email
                        </Label>
                        <Input
                          id="signup-email"
                          name="email"
                          type="email"
                          placeholder="tu@email.com"
                          className="h-12 rounded-lg"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-password" className="text-foreground font-medium">
                          Contraseña
                        </Label>
                        <Input
                          id="signup-password"
                          name="password"
                          type="password"
                          placeholder="Mínimo 6 caracteres"
                          className="h-12 rounded-lg"
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full h-12 rounded-lg" disabled={isLoading}>
                        {isLoading ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Creando cuenta...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            Crear Cuenta
                          </div>
                        )}
                      </Button>
                    </form>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
