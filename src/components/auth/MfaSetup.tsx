import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { authorizedFetch } from '@/lib/authorizedFetch';
import { Shield, KeyRound, Copy, CheckCircle2, AlertTriangle } from 'lucide-react';

interface MfaSetupProps {
  onEnabled?: () => void;
}

export default function MfaSetup({ onEnabled }: MfaSetupProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ enabled: boolean; remainingBackupCodes?: number } | null>(null);
  const [setupData, setSetupData] = useState<{ secret: string; otpauthUri: string; backupCodes: string[] } | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await authorizedFetch('/api/auth/mfa/status');
      if (res.ok) {
        const data = await res.json();
        setStatus({ enabled: data.enabled, remainingBackupCodes: data.remainingBackupCodes });
      }
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchStatus(); }, []);

  const handleSetup = async () => {
    setLoading(true);
    try {
      const res = await authorizedFetch('/api/auth/mfa/setup', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Échec setup MFA');
      setSetupData({ secret: data.secret, otpauthUri: data.otpauthUri, backupCodes: data.backupCodes });
      toast({ title: 'MFA initialisé', description: 'Scannez le QR code avec votre application d’authentification.' });
    } catch (e: any) {
      toast({ title: 'Erreur MFA', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const handleVerify = async () => {
    if (!verifyCode) return;
    setVerifying(true);
    try {
      const res = await authorizedFetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verifyCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Code invalide');
      toast({ title: 'MFA activé', description: 'Votre compte est maintenant protégé par TOTP.' });
      setSetupData(null);
      setVerifyCode('');
      fetchStatus();
      onEnabled?.();
    } catch (e: any) {
      toast({ title: 'Code invalide', description: e.message, variant: 'destructive' });
    } finally { setVerifying(false); }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copié', description: 'Valeur copiée dans le presse-papier.' });
  };

  if (status?.enabled) {
    return (
      <Card className="border-emerald-200 bg-emerald-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-emerald-800"><CheckCircle2 className="text-emerald-600" /> MFA activé</CardTitle>
          <CardDescription>Votre compte est protégé par TOTP. Codes de secours restants : {status.remainingBackupCodes}</CardDescription>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          <p>Politique P1.7 : session courte (15 min) + refresh tournant (7 j) + révocation server-side. Verrouillage après 5 échecs.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Shield size={18} /> Activer MFA TOTP (P1.7)</CardTitle>
        <CardDescription>Renforcez la sécurité avec un code à usage unique (Google Authenticator, Authy, 1Password). Conforme ANSSI / BCT.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!setupData ? (
          <>
            <div className="text-xs bg-amber-50 border border-amber-200 p-3 rounded-md text-amber-900 flex gap-2">
              <AlertTriangle size={14} className="mt-0.5" />
              <span>En mode démo, le secret est chiffré AES-256-GCM au repos (clé dérivée de APP_AUTH_SECRET). En production, stockage via KMS/HSM (lot P2).</span>
            </div>
            <Button onClick={handleSetup} disabled={loading} className="w-full">
              <KeyRound size={16} className="mr-2" /> {loading ? 'Initialisation...' : 'Initialiser MFA TOTP'}
            </Button>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <Label>Secret (à saisir manuellement si QR indisponible)</Label>
              <div className="flex gap-2">
                <Input value={setupData.secret} readOnly className="font-mono text-xs" />
                <Button variant="outline" size="icon" onClick={() => copy(setupData.secret)}><Copy size={14} /></Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>URI otpauth (QR code)</Label>
              <div className="bg-white border p-3 rounded-md break-all font-mono text-[11px]">{setupData.otpauthUri}</div>
              <p className="text-[11px] text-muted-foreground">Ouvrez votre app d’authentification → scanner → le QR est généré à partir de cette URI. Vous pouvez aussi utiliser la page <a href="/totp-assistant" className="underline">/totp-assistant</a> pour générer le code côté client.</p>
              {/* QR placeholder — on affiche un QR via API externe si besoin */}
              <div className="flex justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(setupData.otpauthUri)}`}
                  alt="QR Code TOTP"
                  className="border rounded-md"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Codes de secours (à conserver hors ligne, usage unique)</Label>
              <div className="grid grid-cols-2 gap-2">
                {setupData.backupCodes.map(c => (
                  <div key={c} className="font-mono text-xs bg-slate-100 border p-2 rounded-md text-center">{c}</div>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={() => copy(setupData.backupCodes.join('\n'))}>Copier tous les codes</Button>
            </div>

            <div className="space-y-2 pt-2 border-t">
              <Label>Code TOTP (6 chiffres) pour activer</Label>
              <div className="flex gap-2">
                <Input value={verifyCode} onChange={e => setVerifyCode(e.target.value)} placeholder="123456" className="font-mono" maxLength={8} />
                <Button onClick={handleVerify} disabled={verifying || !verifyCode}>{verifying ? 'Vérif...' : 'Vérifier & Activer'}</Button>
              </div>
              <p className="text-[11px] text-muted-foreground">Fenêtre de tolérance ±1 pas (30s) pour compenser dérive d’horloge. Conforme RFC 6238.</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
