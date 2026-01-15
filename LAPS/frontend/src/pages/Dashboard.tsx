import { useState } from 'react';
import { Loader2, CheckCircle, Monitor, Send, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { Logo } from '../components/Logo';

export function Dashboard() {
  const [hostname, setHostname] = useState('');
  const [requesterName, setRequesterName] = useState('');
  const [justification, setJustification] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(false);
  const [requestId, setRequestId] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    
    if (!requesterName.trim()) {
      setSubmitError('Bitte geben Sie Ihren Namen ein.');
      return;
    }
    
    if (!hostname.trim()) {
      setSubmitError('Bitte geben Sie den Hostnamen ein.');
      return;
    }
    
    if (justification.length < 20) {
      setSubmitError('Die Begründung muss mindestens 20 Zeichen lang sein.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/requests/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostname: hostname.toUpperCase(),
          requesterName,
          justification,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Anfrage fehlgeschlagen');
      }
      
      setRequestId(data.data.id);
      setSuccess(true);
      setHostname('');
      setRequesterName('');
      setJustification('');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Fehler beim Erstellen');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewRequest = () => {
    setSuccess(false);
    setRequestId('');
  };

  if (success) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="w-full max-w-md animate-fade-in">
          <Card className="border-green-500/30 shadow-lg">
            <CardContent className="pt-8 pb-8">
              <div className="text-center space-y-6">
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold">Anfrage erstellt</h2>
                  <p className="text-sm text-muted-foreground">
                    Ihre Anfrage wurde erfolgreich übermittelt
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Anfrage-ID</p>
                  <p className="font-mono text-sm font-medium">{requestId}</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Ein Administrator wird Ihre Anfrage prüfen. Das Passwort wird Ihnen nach Genehmigung mitgeteilt.
                </p>
                <Button onClick={handleNewRequest} className="w-full">
                  Neue Anfrage
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-lg animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size={56} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">LAPS Passwort-Anfrage</h1>
          <p className="text-muted-foreground text-sm mt-2">
            Fordern Sie das lokale Admin-Passwort für einen Computer an
          </p>
        </div>

        {/* Form Card */}
        <Card className="shadow-lg">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {submitError && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}
              
              {/* Name Field */}
              <div className="space-y-2">
                <label htmlFor="requesterName" className="text-sm font-medium flex items-center justify-between">
                  <span>Ihr Name</span>
                  <span className="text-xs text-muted-foreground font-normal">Pflichtfeld</span>
                </label>
                <Input
                  id="requesterName"
                  placeholder="Max Mustermann"
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  disabled={submitting}
                  className="h-11"
                />
              </div>
              
              {/* Hostname Field */}
              <div className="space-y-2">
                <label htmlFor="hostname" className="text-sm font-medium flex items-center justify-between">
                  <span>Computer-Name</span>
                  <span className="text-xs text-muted-foreground font-normal">NetBIOS, max. 15 Zeichen</span>
                </label>
                <div className="relative">
                  <Monitor className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="hostname"
                    placeholder="PC-WORKSTATION01"
                    value={hostname}
                    onChange={(e) => setHostname(e.target.value.toUpperCase())}
                    maxLength={15}
                    disabled={submitting}
                    className="h-11 pl-10 font-mono uppercase"
                  />
                </div>
              </div>
              
              {/* Justification Field */}
              <div className="space-y-2">
                <label htmlFor="justification" className="text-sm font-medium flex items-center justify-between">
                  <span>Begründung</span>
                  <span className={`text-xs font-normal ${justification.length >= 20 ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {justification.length}/20 Zeichen
                  </span>
                </label>
                <textarea
                  id="justification"
                  className="flex min-h-[100px] w-full rounded-lg border border-input bg-background px-3 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  placeholder="Warum benötigen Sie das Admin-Passwort? (z.B. Software-Installation, Treiberupdate...)"
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  disabled={submitting}
                />
              </div>
              
              {/* Submit Button */}
              <Button 
                type="submit" 
                disabled={submitting} 
                className="w-full h-11 gap-2 text-base"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Wird gesendet...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Anfrage absenden
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer Info */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Ihre Anfrage wird von einem Administrator geprüft.
          Bei Fragen wenden Sie sich an die IT-Abteilung.
        </p>
      </div>
    </div>
  );
}
