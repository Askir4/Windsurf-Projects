import { useState, useEffect } from 'react';
import { 
  Loader2, CheckCircle, XCircle, AlertTriangle, Monitor, User, 
  Clock, RefreshCw, ChevronRight, Shield, FileText
} from 'lucide-react';
import { requestsApi } from '../services/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { formatDate, getStatusColor, getStatusLabel } from '../lib/utils';
import type { PasswordRequest } from '../types';

export function Admin() {
  const [queue, setQueue] = useState<PasswordRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<PasswordRequest | null>(null);
  const [comment, setComment] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadQueue();
  }, []);

  const loadQueue = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await requestsApi.getQueue();
      setQueue(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (action: 'approve' | 'deny') => {
    if (!selectedRequest) return;
    
    setProcessing(true);
    try {
      await requestsApi.review(selectedRequest.id, action, comment);
      setSelectedRequest(null);
      setComment('');
      loadQueue();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler bei der Bearbeitung');
    } finally {
      setProcessing(false);
    }
  };

  const loadRequestDetails = async (id: string) => {
    try {
      const request = await requestsApi.getById(id);
      setSelectedRequest(request);
      setComment('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Anfragen-Queue</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Passwort-Anfragen prüfen und genehmigen
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadQueue} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Aktualisieren
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center justify-between">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={() => setError('')}>×</Button>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Queue List */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
              <Clock className="w-4 h-4" />
              Offene Anfragen
            </h2>
            <Badge variant="secondary">{queue.length}</Badge>
          </div>
          
          {queue.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                </div>
                <p className="text-sm text-muted-foreground">Keine offenen Anfragen</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {queue.map((request) => (
                <button
                  key={request.id}
                  onClick={() => loadRequestDetails(request.id)}
                  className={`w-full text-left p-4 rounded-lg border transition-all hover:shadow-sm ${
                    selectedRequest?.id === request.id 
                      ? 'border-primary bg-primary/5 shadow-sm' 
                      : 'border-border bg-card hover:border-muted-foreground/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Monitor className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="font-medium text-sm truncate">{request.hostname}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <User className="w-3 h-3" />
                        <span className="truncate">{request.requesterName}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex flex-col gap-1">
                        <span className={`w-2 h-2 rounded-full ${request.computerFound ? 'bg-green-500' : 'bg-yellow-500'}`} />
                        <span className={`w-2 h-2 rounded-full ${request.lapsAvailable ? 'bg-green-500' : 'bg-yellow-500'}`} />
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2">
                    {formatDate(request.createdAt)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-3">
          {selectedRequest ? (
            <Card className="sticky top-24">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Shield className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{selectedRequest.hostname}</CardTitle>
                      <p className="text-xs text-muted-foreground">Anfrage prüfen</p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(selectedRequest.status)}>
                    {getStatusLabel(selectedRequest.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <InfoItem label="Anforderer" value={selectedRequest.requesterName} />
                  <InfoItem label="Benutzer-ID" value={selectedRequest.requesterId} mono />
                  <InfoItem label="Erstellt" value={formatDate(selectedRequest.createdAt)} />
                  <InfoItem label="Anfrage-ID" value={selectedRequest.id.slice(0, 8)} mono />
                </div>

                {/* Status Badges */}
                <div className="flex gap-2 flex-wrap">
                  <StatusBadge 
                    ok={selectedRequest.computerFound} 
                    okText="Computer in AD" 
                    warnText="Nicht in AD" 
                  />
                  <StatusBadge 
                    ok={selectedRequest.lapsAvailable} 
                    okText="LAPS verfügbar" 
                    warnText="Kein LAPS" 
                  />
                </div>

                {/* Warnings */}
                {!selectedRequest.computerFound && (
                  <Warning text="Der Computer wurde nicht im Active Directory gefunden. Prüfen Sie den Hostnamen." />
                )}
                {!selectedRequest.lapsAvailable && selectedRequest.computerFound && (
                  <Warning text="Für diesen Computer ist kein LAPS-Passwort hinterlegt." />
                )}

                {/* Justification */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-2">
                    <FileText className="w-3 h-3" />
                    Begründung
                  </label>
                  <div className="rounded-lg bg-muted/50 p-4 text-sm leading-relaxed">
                    {selectedRequest.justification || '[Nicht verfügbar]'}
                  </div>
                </div>

                {/* Comment */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
                    Kommentar (optional)
                  </label>
                  <Input
                    placeholder="Kommentar zur Entscheidung..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    disabled={processing}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={() => handleReview('approve')}
                    disabled={processing || !selectedRequest.lapsAvailable}
                    className="flex-1 h-11"
                  >
                    {processing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Genehmigen
                      </>
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleReview('deny')}
                    disabled={processing}
                    className="flex-1 h-11"
                  >
                    {processing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 mr-2" />
                        Ablehnen
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-16 text-center">
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                  <Monitor className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Wählen Sie eine Anfrage aus der Liste
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className={`text-sm font-medium truncate ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ ok, okText, warnText }: { ok: boolean; okText: string; warnText: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
      ok ? 'bg-green-500/10 text-green-600' : 'bg-yellow-500/10 text-yellow-600'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-green-500' : 'bg-yellow-500'}`} />
      {ok ? okText : warnText}
    </span>
  );
}

function Warning({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/10">
      <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
      <p className="text-sm text-yellow-700 dark:text-yellow-400">{text}</p>
    </div>
  );
}
