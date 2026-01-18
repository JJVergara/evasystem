import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Hash, Clock } from 'lucide-react';
import type { Fiesta } from '@/hooks/useFiestas';

interface FiestaDetailsModalProps {
  fiesta: Fiesta | null;
  isOpen: boolean;
  onClose: () => void;
}

export function FiestaDetailsModal({ fiesta, isOpen, onClose }: FiestaDetailsModalProps) {
  if (!fiesta) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-foreground">{fiesta.name}</DialogTitle>
            <Badge variant={fiesta.status === 'active' ? 'default' : 'secondary'} className="ml-2">
              {fiesta.status === 'active' ? 'Activa' : 'Inactiva'}
            </Badge>
          </div>
          {fiesta.description && (
            <DialogDescription className="text-base text-muted-foreground mt-2">
              {fiesta.description}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-foreground">Detalles del Evento</h3>
            <div className="grid gap-4">
              {fiesta.event_date && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border">
                  <div className="w-10 h-10 shrink-0 rounded-full bg-info flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-info-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Fecha del Evento</p>
                    <p className="text-muted-foreground">
                      {new Date(fiesta.event_date).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        weekday: 'long',
                      })}
                    </p>
                  </div>
                </div>
              )}

              {fiesta.location && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border">
                  <div className="w-10 h-10 shrink-0 rounded-full bg-success flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-success-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Ubicación</p>
                    <p className="text-muted-foreground">{fiesta.location}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {(fiesta.main_hashtag || fiesta.secondary_hashtags) && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-foreground">Hashtags</h3>
              <div className="space-y-3">
                {fiesta.main_hashtag && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
                    <div className="w-10 h-10 shrink-0 rounded-full bg-primary flex items-center justify-center">
                      <Hash className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Hashtag Principal</p>
                      <p className="text-primary font-mono">{fiesta.main_hashtag}</p>
                    </div>
                  </div>
                )}

                {fiesta.secondary_hashtags && fiesta.secondary_hashtags.length > 0 && (
                  <div className="p-3 rounded-xl bg-muted/50 border border-border">
                    <p className="font-medium text-foreground mb-2">Hashtags Secundarios</p>
                    <div className="flex flex-wrap gap-2">
                      {fiesta.secondary_hashtags.map((hashtag, index) => (
                        <Badge key={index} variant="outline">
                          {hashtag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-foreground">Información del Sistema</h3>
            <div className="grid gap-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground">Creada</p>
                  <p className="text-muted-foreground">
                    {new Date(fiesta.created_at).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground">Última Actualización</p>
                  <p className="text-muted-foreground">
                    {new Date(fiesta.updated_at).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
