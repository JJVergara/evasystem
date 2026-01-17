import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { useFiestas } from '@/hooks/useFiestas';
import { EMOJIS } from '@/constants';

interface FiestaSelectorProps {
  onFiestaChange: (fiestaId: string | null) => void;
  selectedFiestaId: string | null;
}

export function FiestaSelector({ onFiestaChange, selectedFiestaId }: FiestaSelectorProps) {
  const { fiestas, loading } = useFiestas();

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse h-10 bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <span className="text-primary">{EMOJIS.entities.fiesta}</span>
          <div className="flex-1">
            <Select
              value={selectedFiestaId || 'all'}
              onValueChange={(value) => onFiestaChange(value === 'all' ? null : value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar fiesta..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <span>{EMOJIS.entities.calendar}</span>
                    Todas las fiestas
                  </div>
                </SelectItem>
                {fiestas.map((fiesta) => (
                  <SelectItem key={fiesta.id} value={fiesta.id}>
                    <div className="flex items-center gap-2">
                      <span>{EMOJIS.entities.fiesta}</span>
                      <div>
                        <p className="font-medium">{fiesta.name}</p>
                        {fiesta.event_date && (
                          <p className="text-xs text-muted-foreground">
                            {new Date(fiesta.event_date).toLocaleDateString('es-ES')}
                          </p>
                        )}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
