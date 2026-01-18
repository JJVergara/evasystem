import { useState } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useFiestas } from '@/hooks/useFiestas';
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization';

interface FiestaSelectorProps {
  className?: string;
}

export function FiestaSelector({ className }: FiestaSelectorProps) {
  const [open, setOpen] = useState(false);
  const { fiestas, selectedFiesta, setSelectedFiestaId, loading } = useFiestas();
  const { organization } = useCurrentOrganization();

  if (loading) {
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        <div className="h-9 w-full animate-pulse rounded-md bg-muted"></div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        <span className="text-sm text-muted-foreground">Sin organización</span>
      </div>
    );
  }

  if (fiestas.length === 0) {
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        <span className="text-sm text-muted-foreground">Sin fiestas</span>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Crear Fiesta
        </Button>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('justify-between', className)}
        >
          <div className="flex items-center space-x-2 truncate">
            <span className="truncate">
              {selectedFiesta ? selectedFiesta.name : 'Seleccionar fiesta...'}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[90vw] sm:w-80 p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar fiesta..." />
          <CommandList>
            <CommandEmpty>No se encontraron fiestas.</CommandEmpty>
            <CommandGroup>
              {fiestas.map((fiesta) => (
                <CommandItem
                  key={fiesta.id}
                  value={`${fiesta.name} ${fiesta.description || ''}`}
                  onSelect={() => {
                    setSelectedFiestaId(fiesta.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      selectedFiesta?.id === fiesta.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{fiesta.name}</span>
                    {fiesta.description && (
                      <span className="text-xs text-muted-foreground">{fiesta.description}</span>
                    )}
                    {fiesta.event_date && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(fiesta.event_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
