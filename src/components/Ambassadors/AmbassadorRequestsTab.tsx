import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Users, Check, X, Clock, Instagram, MessageCircle } from 'lucide-react';
import type { AmbassadorRequest } from '@/hooks/useAmbassadorRequests';
import { useAmbassadorRequests } from '@/hooks/useAmbassadorRequests';
import { toast } from 'sonner';

interface ApprovalFormData {
  first_name: string;
  last_name: string;
  email: string;
  date_of_birth: string;
  rut: string;
}

export function AmbassadorRequestsTab() {
  const { requests, loading, approveRequest, rejectRequest } = useAmbassadorRequests();
  const [selectedRequest, setSelectedRequest] = useState<AmbassadorRequest | null>(null);
  const [approvalForm, setApprovalForm] = useState<ApprovalFormData>({
    first_name: '',
    last_name: '',
    email: '',
    date_of_birth: '',
    rut: '',
  });
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const processedRequests = requests.filter((r) => r.status !== 'pending');

  const handleApprove = async () => {
    if (!selectedRequest) return;

    if (
      !approvalForm.first_name.trim() ||
      !approvalForm.last_name.trim() ||
      !approvalForm.email.trim()
    ) {
      toast.error('Nombre, apellido y email son requeridos');
      return;
    }

    setActionLoading(true);
    try {
      await approveRequest(selectedRequest.id, approvalForm);
      setSelectedRequest(null);
      setApprovalForm({ first_name: '', last_name: '', email: '', date_of_birth: '', rut: '' });
    } catch {
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (requestId: string) => {
    setActionLoading(true);
    try {
      await rejectRequest(requestId, rejectionReason);
      setRejectionReason('');
    } catch {
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-700 border-yellow-200';
      case 'approved':
        return 'bg-green-500/10 text-green-700 border-green-200';
      case 'rejected':
        return 'bg-red-500/10 text-red-700 border-red-200';
      default:
        return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'approved':
        return 'Aprobado';
      case 'rejected':
        return 'Rechazado';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-2">
          <div className="animate-spin h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Cargando solicitudes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Solicitudes Pendientes ({pendingRequests.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay solicitudes pendientes</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingRequests.map((request) => (
                <Card key={request.id} className="border-dashed">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={request.profile_picture_url} />
                        <AvatarFallback>
                          <Instagram className="h-6 w-6" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">@{request.instagram_username}</h3>
                        <p className="text-sm text-muted-foreground">
                          {request.follower_count.toLocaleString()} seguidores
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <MessageCircle className="h-4 w-4" />
                        <span>{request.total_mentions} menciones</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Última actividad: {new Date(request.last_mention_at).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => setSelectedRequest(request)}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Aprobar
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Aprobar Embajador</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="text-sm text-muted-foreground">
                              Completa los datos del embajador @
                              {selectedRequest?.instagram_username}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="first_name">Nombre *</Label>
                                <Input
                                  id="first_name"
                                  value={approvalForm.first_name}
                                  onChange={(e) =>
                                    setApprovalForm({ ...approvalForm, first_name: e.target.value })
                                  }
                                  required
                                />
                              </div>
                              <div>
                                <Label htmlFor="last_name">Apellido *</Label>
                                <Input
                                  id="last_name"
                                  value={approvalForm.last_name}
                                  onChange={(e) =>
                                    setApprovalForm({ ...approvalForm, last_name: e.target.value })
                                  }
                                  required
                                />
                              </div>
                            </div>

                            <div>
                              <Label htmlFor="email">Email *</Label>
                              <Input
                                id="email"
                                type="email"
                                value={approvalForm.email}
                                onChange={(e) =>
                                  setApprovalForm({ ...approvalForm, email: e.target.value })
                                }
                                required
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="date_of_birth">Fecha de Nacimiento</Label>
                                <Input
                                  id="date_of_birth"
                                  type="date"
                                  value={approvalForm.date_of_birth}
                                  onChange={(e) =>
                                    setApprovalForm({
                                      ...approvalForm,
                                      date_of_birth: e.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div>
                                <Label htmlFor="rut">RUT</Label>
                                <Input
                                  id="rut"
                                  value={approvalForm.rut}
                                  onChange={(e) =>
                                    setApprovalForm({ ...approvalForm, rut: e.target.value })
                                  }
                                />
                              </div>
                            </div>

                            <div className="flex justify-end gap-2">
                              <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                                Cancelar
                              </Button>
                              <Button onClick={handleApprove} disabled={actionLoading}>
                                {actionLoading ? 'Aprobando...' : 'Aprobar Embajador'}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <X className="h-4 w-4 mr-1" />
                            Rechazar
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Rechazar Solicitud</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="text-sm text-muted-foreground">
                              ¿Estás seguro de rechazar la solicitud de @
                              {request.instagram_username}?
                            </div>

                            <div>
                              <Label htmlFor="rejection_reason">Razón del rechazo (opcional)</Label>
                              <Textarea
                                id="rejection_reason"
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="Escribe la razón del rechazo..."
                              />
                            </div>

                            <div className="flex justify-end gap-2">
                              <Button variant="outline">Cancelar</Button>
                              <Button
                                variant="destructive"
                                onClick={() => handleReject(request.id)}
                                disabled={actionLoading}
                              >
                                {actionLoading ? 'Rechazando...' : 'Rechazar'}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {processedRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Solicitudes Procesadas ({processedRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {processedRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={request.profile_picture_url} />
                      <AvatarFallback>
                        <Instagram className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">@{request.instagram_username}</p>
                      <p className="text-sm text-muted-foreground">
                        {request.total_mentions} menciones
                      </p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(request.status)}>
                    {getStatusLabel(request.status)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
