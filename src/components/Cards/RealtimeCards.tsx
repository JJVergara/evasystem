
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, Info, Star, Eye, RefreshCw, Loader2 } from "lucide-react";
import { useRealtimeCards } from "@/hooks/useRealtimeCards";
import { formatDistance } from "date-fns";
import { es } from "date-fns/locale";
import { useState } from "react";

const getCardIcon = (type: string) => {
  switch (type) {
    case 'success':
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'warning':
      return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    case 'info':
      return <Info className="w-5 h-5 text-blue-500" />;
    case 'achievement':
      return <Star className="w-5 h-5 text-purple-500" />;
    default:
      return <Info className="w-5 h-5 text-gray-500" />;
  }
};

const getCardColor = (type: string) => {
  switch (type) {
    case 'success':
      return 'border-green-200 bg-green-50';
    case 'warning':
      return 'border-yellow-200 bg-yellow-50';
    case 'info':
      return 'border-blue-200 bg-blue-50';
    case 'achievement':
      return 'border-purple-200 bg-purple-50';
    default:
      return 'border-gray-200 bg-gray-50';
  }
};

export default function RealtimeCards() {
  const { cards, loading, markAsRead, refreshCards } = useRealtimeCards();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshCards();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2">Cargando actividad reciente...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              Actividad Reciente
            </CardTitle>
            <CardDescription>
              {cards.length === 0 ? 'No hay actividad reciente' : `Últimas ${cards.length} actividades del sistema`}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="h-8 w-8 p-0"
          >
            {refreshing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {cards.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No hay actividad registrada aún</p>
            <p className="text-sm">Las nuevas actividades aparecerán aquí automáticamente</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="mt-3"
              disabled={refreshing}
            >
              {refreshing ? (
                <>
                  <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                  Actualizando...
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3 mr-2" />
                  Buscar actividad
                </>
              )}
            </Button>
          </div>
        ) : (
          cards.map((card) => (
            <div
              key={card.id}
              className={`p-3 rounded-lg border-l-4 ${getCardColor(card.type)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {getCardIcon(card.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {card.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDistance(new Date(card.created_at), new Date(), {
                        addSuffix: true,
                        locale: es
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    Nuevo
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => markAsRead(card.id)}
                  >
                    <Eye className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
