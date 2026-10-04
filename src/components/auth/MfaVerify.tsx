import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { ShieldCheck } from 'lucide-react';

interface MfaVerifyProps {
  email: string;
  mfaToken?: string;
  onSuccess: (data: { token: string; expiresAt: number; refreshToken: string; user: any }) => void;
  onCancel?: () => void;
}

export default function MfaVerify({ email, mfaToken, onSuccess, onCancel }: MfaVerifyProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!code) return;
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login/mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, mfaCode: code, mfaToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Code invalide');
      toast({ title: 'MFA vérifié', description: `Bienvenue ${data.user.name}` });
      onSuccess(data);
    } catch (e: any) {
      toast({ title: 'Échec MFA', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ShieldCheck className="text-emerald-600" /> Vérification MFA</CardTitle>
        <CardDescription>Compte {email} protégé par TOTP. Saisissez le code à 6 chiffres de votre application d’authentification (ou un code de secours à 8 caractères).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Code TOTP / secours</Label>
          <Input value={code} onChange={e => setCode(e.target.value)} placeholder="123456 ou ABCD1234" className="font-mono" autoFocus maxLength={8} />
        </div>
        <div className="flex gap-2">
          <Button onClick={handleVerify} disabled={loading || !code} className="flex-1">{loading ? 'Vérification...' : 'Vérifier'}</Button>
          {onCancel && <Button variant="outline" onClick={onCancel}>Annuler</Button>}
        </div>
        <p className="text-[11px] text-muted-foreground">Politique P1.7 : après 5 échecs, compte verrouillé 15 min (backoff exponentiel jusqu’à 2h). Session courte 15 min + refresh tournant 7 j, révocable server-side.</p>
      </CardContent>
    </Card>
  );
}
