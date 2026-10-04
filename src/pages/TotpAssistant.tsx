import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { generateTotpClient, remainingSecondsClient, buildOtpauthUriClient, generateRandomSecretClient } from '@/lib/totpAssistant';
import { Copy, RefreshCw, Shield, Clock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function TotpAssistant() {
  const [secret, setSecret] = useState('JBSWY3DPEHPK3PXP'); // secret démo RFC 6238
  const [account, setAccount] = useState('agent@recovai.tn');
  const [code, setCode] = useState('------');
  const [remaining, setRemaining] = useState(30);
  const [uri, setUri] = useState('');

  const refreshCode = async () => {
    try {
      const c = await generateTotpClient(secret, 30, 6, Date.now());
      setCode(c);
      setRemaining(remainingSecondsClient(30));
      setUri(buildOtpauthUriClient(secret, account, 'RecovAI'));
    } catch (e: any) {
      console.error(e);
      setCode('ERR');
    }
  };

  useEffect(() => {
    refreshCode();
    const iv = setInterval(refreshCode, 1000);
    return () => clearInterval(iv);
  }, [secret, account]);

  const handleRandom = () => {
    const s = generateRandomSecretClient(20);
    setSecret(s);
    toast({ title: 'Secret généré', description: 'Nouveau secret aléatoire (20 bytes Base32).' });
  };

  const copy = (t: string) => {
    navigator.clipboard.writeText(t);
    toast({ title: 'Copié', description: 'Copié dans le presse-papier.' });
  };

  return (
    <div className="container max-w-3xl mx-auto py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="text-emerald-600" size={28} />
        <div>
          <h1 className="text-2xl font-bold">Assistant TOTP — Démo & Debug (P1.7)</h1>
          <p className="text-sm text-muted-foreground">Génère des codes TOTP côté navigateur (sans envoi serveur) pour tester le flux MFA. Conforme RFC 6238 / RFC 4226.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
          <CardDescription>Secret Base32 (16+ chars, alphabet A-Z2-7). En prod, le secret est généré côté serveur et chiffré AES-256-GCM au repos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Secret Base32</Label>
              <div className="flex gap-2">
                <Input value={secret} onChange={e => setSecret(e.target.value.toUpperCase())} className="font-mono" />
                <Button variant="outline" size="icon" onClick={handleRandom} title="Générer aléatoire"><RefreshCw size={16} /></Button>
                <Button variant="outline" size="icon" onClick={() => copy(secret)}><Copy size={16} /></Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Compte (label otpauth)</Label>
              <Input value={account} onChange={e => setAccount(e.target.value)} placeholder="email" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>URI otpauth (pour QR)</Label>
            <div className="bg-slate-50 border p-3 rounded-md font-mono text-xs break-all">{uri}</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => copy(uri)}>Copier URI</Button>
              <a href={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(uri)}`} target="_blank" rel="noreferrer" className="text-xs underline py-2">Ouvrir QR en grand</a>
            </div>
            <div className="flex justify-center pt-2">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(uri)}`} alt="QR TOTP" className="border rounded-md" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-emerald-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Clock size={18} /> Code actuel</CardTitle>
          <CardDescription>Se régénère toutes les 30s. Fenêtre serveur ±1 pas (tolérance 60s).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-5xl font-mono font-bold tracking-widest">{code}</div>
            <div className="mt-2 text-sm text-muted-foreground">Expire dans {remaining}s</div>
            <div className="w-full bg-slate-200 h-2 rounded-full mt-3 overflow-hidden">
              <div className="bg-emerald-600 h-2 transition-all" style={{ width: `${(remaining / 30) * 100}%` }} />
            </div>
          </div>
          <div className="flex justify-center gap-2">
            <Button onClick={refreshCode} variant="outline"><RefreshCw size={14} className="mr-2" /> Régénérer maintenant</Button>
            <Button onClick={() => copy(code)}><Copy size={14} className="mr-2" /> Copier code</Button>
          </div>
          <div className="text-xs bg-amber-50 border border-amber-200 p-3 rounded-md text-amber-900">
            <strong>Usage démo :</strong> copiez ce code dans l’écran de vérification MFA (<code>/auth</code> → après password → écran MFA). Pour le multi-tenant, testez avec <code>agent.amen@recovai.tn</code> et <code>agent.tunisiemf@recovai.tn</code> (même password démo <code>RecovAI#Tenant!2026</code>) après avoir activé MFA pour chacun via <code>/settings</code>.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Déroulé de test rapide (P1.7)</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <ol className="list-decimal ml-5 space-y-1">
            <li>Connectez-vous avec <code>admin@recovai.tn</code> / <code>RecovAI#Admin!2026</code>.</li>
            <li>Allez dans <code>/settings</code> → section MFA → Initialiser → scanner QR avec Authenticator ou utiliser cet assistant pour générer le code.</li>
            <li>Déconnectez-vous, reconnectez-vous : le second step MFA doit apparaître.</li>
            <li>Testez le verrouillage : 5 échecs MFA → 423 Locked (15 min).</li>
            <li>Testez refresh tournant : appelez <code>POST /api/auth/mfa/refresh</code> avec refreshToken, vérifiez rotation + révocation ancien token.</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
