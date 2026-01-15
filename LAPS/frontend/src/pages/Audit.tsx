import { useState, useEffect } from 'react';
import { Loader2, Download, Search, FileText, Calendar, RefreshCw } from 'lucide-react';
import { auditApi } from '../services/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { formatDate } from '../lib/utils';
import type { AuditLog } from '../types';

export function Audit() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    eventType: '',
    userId: '',
    hostname: '',
    fromDate: '',
    toDate: '',
  });
  const [eventTypes, setEventTypes] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadEventTypes();
    loadLogs();
  }, [page]);

  const loadEventTypes = async () => {
    try {
      const types = await auditApi.getEventTypes();
      setEventTypes(types);
    } catch (err) {
      console.error('Failed to load event types', err);
    }
  };

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await auditApi.getLogs({ ...filters, page, pageSize: 50 });
      setLogs(response.data || []);
      setTotal(response.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadLogs();
  };

  const handleExport = async () => {
    try {
      const blob = await auditApi.exportCsv(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export fehlgeschlagen');
    }
  };

  const getEventBadge = (eventType: string) => {
    let color = 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
    if (eventType.includes('APPROVED') || eventType.includes('SUCCESS')) {
      color = 'bg-green-500/10 text-green-600 dark:text-green-400';
    } else if (eventType.includes('DENIED') || eventType.includes('FAILED')) {
      color = 'bg-red-500/10 text-red-600 dark:text-red-400';
    } else if (eventType.includes('WARNING') || eventType.includes('EXCEEDED')) {
      color = 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400';
    }
    return (
      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide ${color}`}>
        {eventType.replace(/_/g, ' ')}
      </span>
    );
  };

  const totalPages = Math.ceil(total / 50);

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit-Logs</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Alle Aktivitäten und Ereignisse ({total} Einträge)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Search className="w-4 h-4 mr-1.5" />
            Filter
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-1.5" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={loadLogs} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Event-Typ</label>
                <select
                  value={filters.eventType}
                  onChange={(e) => setFilters({ ...filters, eventType: e.target.value })}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="">Alle</option>
                  {eventTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Benutzer</label>
                <Input
                  placeholder="Benutzer-ID"
                  value={filters.userId}
                  onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                  className="h-9"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Hostname</label>
                <Input
                  placeholder="Computer"
                  value={filters.hostname}
                  onChange={(e) => setFilters({ ...filters, hostname: e.target.value })}
                  className="h-9"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Von</label>
                <Input
                  type="date"
                  value={filters.fromDate}
                  onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
                  className="h-9"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Bis</label>
                <Input
                  type="date"
                  value={filters.toDate}
                  onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
                  className="h-9"
                />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button size="sm" onClick={handleSearch}>
                <Search className="w-4 h-4 mr-1.5" />
                Suchen
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Ereignisse
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Keine Einträge gefunden
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">Zeit</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">Event</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">Benutzer</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">Host</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {formatDate(log.timestamp)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {getEventBadge(log.eventType)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium">{log.userName}</span>
                        <span className="text-muted-foreground text-xs block">{log.userId}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {log.hostname || '—'}
                      </td>
                      <td className="px-4 py-3 max-w-xs truncate text-muted-foreground text-xs">
                        {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-xs text-muted-foreground">
                Seite {page} von {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Zurück
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Weiter
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
