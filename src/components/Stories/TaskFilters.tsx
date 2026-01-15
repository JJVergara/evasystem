import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search } from 'lucide-react';

interface TaskFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  eventFilter: string;
  onEventFilterChange: (value: string) => void;
  events: Array<{ id: string; name: string }>;
}

export function TaskFilters({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  eventFilter,
  onEventFilterChange,
  events,
}: TaskFiltersProps) {
  return (
    <div className="flex gap-4 items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por embajador..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      <Select value={statusFilter} onValueChange={onStatusFilterChange}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Filtrar por estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los estados</SelectItem>
          <SelectItem value="pending">Pendientes</SelectItem>
          <SelectItem value="uploaded">Subidas</SelectItem>
          <SelectItem value="in_progress">En Progreso</SelectItem>
          <SelectItem value="completed">Completadas</SelectItem>
          <SelectItem value="invalid">Inválidas</SelectItem>
          <SelectItem value="expired">Expiradas</SelectItem>
        </SelectContent>
      </Select>

      <Select value={eventFilter} onValueChange={onEventFilterChange}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Filtrar por evento" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los eventos</SelectItem>
          {events.map((event) => (
            <SelectItem key={event.id} value={event.id}>
              {event.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
