import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileCode2, Search, ArrowRight, Table, Database, CheckSquare,
  FileDown, BookOpen, Layers, ShieldCheck
} from 'lucide-react';
import { AccountingEntry } from '../../types/factoring';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';

interface FactoringAccountingProps {
  entries: AccountingEntry[];
}

export default function FactoringAccounting({ entries }: FactoringAccountingProps) {
  const [search, setSearch] = useState('');

  // SAGE format exporter simulator
  const handleExportSage = () => {
    // Generate a beautiful structured ASCII ledger preview
    let output = '';
    entries.forEach(entry => {
      output += `\n* JOURNAL OD | DATE: ${entry.entryDate} | LIBELLE: ${entry.description}\n`;
      entry.transactions.forEach(t => {
        output += `  Compte: ${t.accountNumber} [${t.accountLabel.padEnd(30, ' ')}] | DÉBIT: ${t.debit.toString().padEnd(8, ' ')} | CRÉDIT: ${t.credit}\n`;
      });
    });

    // Create a virtual file download
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SAGE_FEC_RECOVAI_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Grand Livre Exporté !',
      description: 'Le fichier structuré FEC conforme SAGE a été téléchargé avec succès.'
    });
  };

  const filteredEntries = entries.filter(entry =>
    entry.description.toLowerCase().includes(search.toLowerCase()) ||
    entry.transactions.some(t => t.accountNumber.includes(search) || t.accountLabel.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      
      {/* Search and Action bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher écriture, compte, journal..."
            className="pl-10 rounded-xl"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <Button onClick={handleExportSage} variant="outline" className="border-navy text-navy rounded-xl gap-2 font-bold hover:bg-slate-50">
          <FileDown size={16} />
          Télécharger Journal (Format FEC SAGE)
        </Button>
      </div>

      {/* Accounting journal table */}
      <div className="space-y-6">
        {filteredEntries.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground border bg-card border-border rounded-2xl">
            <BookOpen className="mx-auto h-8 w-8 text-slate-300 mb-2" />
            Aucun enregistrement comptable correspondant à votre recherche.
          </div>
        ) : (
          filteredEntries.map(entry => (
            <div key={entry.id} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              
              {/* Header card info */}
              <div className="p-4 bg-slate-50 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <span className="p-1 px-2 bg-navy text-white text-[10px] font-black rounded uppercase">JNL - ASSIGNMENT</span>
                  <p className="text-slate-850 font-bold">{entry.description}</p>
                </div>
                <div className="flex items-center gap-4 text-muted-foreground">
                  <span className="font-mono">Date: {new Date(entry.entryDate).toLocaleDateString('fr-FR')}</span>
                  <span className="font-mono">ID: {entry.id}</span>
                </div>
              </div>

              {/* Transaction ledger rows */}
              <div className="overflow-x-auto text-[11px] sm:text-xs">
                <table className="w-full text-left font-mono">
                  <thead>
                    <tr className="bg-slate-50/50 border-b text-[10px] uppercase text-muted-foreground font-bold">
                      <th className="py-2.5 px-6">Numéro Compte</th>
                      <th className="py-2.5 px-6">Intitulé de l'Écriture de tiers</th>
                      <th className="py-2.5 px-6 text-right">Montant Débit (TND)</th>
                      <th className="py-2.5 px-6 text-right">Montant Crédit (TND)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entry.transactions.map((t, idx) => (
                      <tr key={idx} className="border-b last:border-0 hover:bg-slate-50/20">
                        <td className="py-3 px-6 font-bold text-navy">{t.accountNumber}</td>
                        <td className="py-3 px-6 font-medium text-slate-700">{t.accountLabel}</td>
                        <td className="py-3 px-6 text-right font-extrabold text-slate-800">
                          {t.debit > 0 ? `${t.debit.toLocaleString()} TND` : '-'}
                        </td>
                        <td className="py-3 px-6 text-right font-extrabold text-slate-800">
                          {t.credit > 0 ? `${t.credit.toLocaleString()} TND` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
