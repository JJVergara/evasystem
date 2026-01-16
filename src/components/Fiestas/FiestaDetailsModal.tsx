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
      <DialogContent className="sm:max-w-[600px] backdrop-blur-md bg-white/95">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              {fiesta.name}
            </DialogTitle>
            <Badge variant={fiesta.status === 'active' ? 'default' : 'secondary'} className="ml-2">
              {fiesta.status === 'active' ? 'Activa' : 'Inactiva'}
            </Badge>
          </div>
          {fiesta.description && (
            <DialogDescription className="text-base text-gray-600 mt-2">
              {fiesta.description}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-gray-900">Detalles del Evento</h3>
            <div className="grid gap-4">
              {fiesta.event_date && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/50 border border-gray-200/50">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Fecha del Evento</p>
                    <p className="text-gray-600">
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
                <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/50 border border-gray-200/50">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Ubicación</p>
                    <p className="text-gray-600">{fiesta.location}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {(fiesta.main_hashtag || fiesta.secondary_hashtags) && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-gray-900">Hashtags</h3>
              <div className="space-y-3">
                {fiesta.main_hashtag && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-50/50 border border-purple-200/50">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                      <Hash className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Hashtag Principal</p>
                      <p className="text-purple-700 font-mono">{fiesta.main_hashtag}</p>
                    </div>
                  </div>
                )}

                {fiesta.secondary_hashtags && fiesta.secondary_hashtags.length > 0 && (
                  <div className="p-3 rounded-xl bg-gray-50/50 border border-gray-200/50">
                    <p className="font-medium text-gray-900 mb-2">Hashtags Secundarios</p>
                    <div className="flex flex-wrap gap-2">
                      {fiesta.secondary_hashtags.map((hashtag, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="text-gray-700 border-gray-300"
                        >
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
            <h3 className="font-semibold text-lg text-gray-900">Información del Sistema</h3>
            <div className="grid gap-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/50 border border-gray-200/50">
                <Clock className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="font-medium text-gray-900">Creada</p>
                  <p className="text-gray-600">
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

              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/50 border border-gray-200/50">
                <Clock className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="font-medium text-gray-900">Última Actualización</p>
                  <p className="text-gray-600">
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
