import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FolderPlus, 
  Sparkles, 
  UploadCloud, 
  FileText, 
  FileSpreadsheet, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  XOctagon, 
  Scale, 
  Building2, 
  Coins, 
  Check, 
  X, 
  Edit3, 
  Save, 
  Printer, 
  ShieldCheck, 
  HelpCircle, 
  Clock, 
  AlertCircle,
  FileCheck,
  Briefcase,
  Layers,
  ArrowRight,
  RefreshCw,
  Info
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { authorizedFetch } from '@/lib/authorizedFetch';
import { 
  LitigationStore, 
  LegalCase, 
  LegalAction, 
  LegalDocument, 
  Collateral 
} from '@/lib/litigation-store';
import { TUNISIAN_INSTITUTIONS } from '@/data/institutions';

// Field origin tracking types
export type FieldOrigin = 'manual' | 'ai_extracted' | 'user_validated';

interface FieldMeta<T> {
  value: T;
  origin: FieldOrigin;
  sourceDoc?: string;
  sourcePage?: string;
  confidence?: number;
}

interface UploadedDoc {
  id: string;
  name: string;
  size: number;
  type: string;
  extractedText: string;
  previewSnippet?: string;
}

interface RiskItem {
  risque: string;
  niveau: 'Faible' | 'Modéré' | 'Élevé' | 'Critique';
  justification: string;
  documentSource: string;
  actionRecommandee: string;
}

interface ActionItem {
  id: string;
  action: string;
  echeance: string;
  priorite: 'Normale' | 'Haute' | 'Urgente';
  responsable: string;
  statut: 'propose' | 'valide' | 'rejete';
}

interface AIAnalysisReport {
  synthese: {
    resumeExecutif: string;
    parties: string;
    objetDossier: string;
    montantExposition: string;
    situationActuelle: string;
  };
  analyseDocumentaire: {
    documentsAnalyses: string[];
    informationsExtraites: Array<{
      champ: string;
      valeur: string;
      sourceDoc: string;
      page?: string;
      confiance: number;
      status: string;
    }>;
    documentsManquants: string[];
    incoherencesDetectees: string[];
    pointsVerificationHumaine: string[];
  };
  analyseJuridique: {
    engagementsContractuels: string;
    obligationsParties: string;
    garantiesSuretes: string;
    clausesImportantes: string;
    risquesJuridiques: string;
    echeancesPrescriptions: string;
  };
  analyseFinanciere: {
    montantPrincipal: number;
    interetsFrais: number;
    echeances: string;
    expositionGlobale: string;
    garantiesFinancieres: string;
    ratiosEvaluation: string;
  };
  analyseRisques: RiskItem[];
  actionsAEntreprendre: ActionItem[];
  preRemplissageSuggere?: Record<string, { value: any; source: string; confidence: number }>;
}

const PRESET_DOCUMENTS_PACKS = [
  {
    label: 'Pack Standard : Prêt Entreprise STB (PDF + Excel + Word)',
    description: 'Contrat de prêt bancaire, décompte d\'intérêts et mise en demeure d\'avocat',
    files: [
      {
        id: 'doc-pre-1',
        name: 'STB_Contrat_Pret_Corporate_Ref_2023_889.pdf',
        size: 2450000,
        type: 'application/pdf',
        extractedText: `CONTRAT D'OUVERTURE DE CRÉDIT ET DE PRÊT D'ÉQUIPEMENT INDUSTRIEL\nEntre les soussignés : La Société Tunisienne de Banque (STB S.A.), Capital 775 365 930 TND, Agence Tunis-Belvédère.\nEt la Société Maghrébine de Plasturgie S.A.R.L., RC Tunis B0112982020, représentée par M. Karim Mansour, gérant.\nMontant du prêt consenti : 220 000 TND (Deux cent vingt mille dinars tunisiens).\nTaux d'intérêt conventionnel : TMM + 3.25% l'an.\nGaranties : Hypothèque de 1er rang inscrite sur le Titre Foncier n° 45892 Tunis d'une valeur estimée de 320 000 TND.\nCaution personnelle et solidaire de M. Karim Mansour (CIN 04589211).\nClause de déchéance du terme : Tout retard de paiement supérieur à 30 jours rend immédiatement exigible la totalité du solde restant dû.\nAttribution de compétence exclusive : Tribunal de Première Instance de Tunis.`
      },
      {
        id: 'doc-pre-2',
        name: 'STB_Decompte_Echeances_Impayees_2024.xlsx',
        size: 420000,
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        extractedText: `FEUILLE COMPTABLE : SITUATION ANALYTIQUE DES IMPAYÉS\nContrepartie : Ste Maghrébine de Plasturgie\nPrincipal échu impayé : 185 000.000 TND\nIntérêts contractuels échus : 21 450.000 TND\nIntérêts de retard / pénalités BCT : 6 250.000 TND\nFrais d'actes et commissions engagés : 2 100.000 TND\nTotal créance brute réclamée : 214 800.000 TND\nNombre d'échéances en souffrance : 6 mensualités\nDate première échéance impayée : 15/10/2023`
      },
      {
        id: 'doc-pre-3',
        name: 'Mise_En_Demeure_Avocat_Me_Zouari_Avril2024.docx',
        size: 185000,
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        extractedText: `CABINET D'AVOCAT ME SAMI ZOUARI\nAvocat à la Cour de Cassation, Barreau de Tunis\nSOMMATION DE PAYER VALANT MISE EN DEMEURE (Art. 268 COC)\nA l'attention de la Société Maghrébine de Plasturgie SARL et de sa caution solidaire M. Karim Mansour.\nPar la présente, vous êtes mis en demeure de régler à notre cliente, la STB Bank, sous délai impératif de 15 jours à compter de la signification, la somme principale de 214 800 TND.\nA défaut, il sera engagé sans autre avis une requête en ordonnance d'injonction de payer (art. 258 CPCC) ainsi qu'un commandement aux fins de saisie immobilière.`
      }
    ]
  },
  {
    label: 'Pack Crédit-Bail / Leasing TLF (Véhicules & Matériel)',
    description: 'Contrat de crédit-bail, tableau des loyers impayés et mise en demeure de restitution',
    files: [
      {
        id: 'doc-pre-leasing-1',
        name: 'TLF_Contrat_Credit_Bail_Mobilier_LSG2022_44.pdf',
        size: 1980000,
        type: 'application/pdf',
        extractedText: `CONTRAT DE CRÉDIT-BAIL MOBILIER - TUNISIE LEASING & FACTORING (TLF)\nPreneur : Société Transport & Logistique Moderne SARL, Sfax.\nMatériel objet du leasing : 3 Tracteurs routiers Mercedes-Benz Actros 2042.\nValeur d'achat TTC : 360 000 TND. Valeur résiduelle : 1% (3 600 TND).\nDurée : 48 mois. Loyers mensuels constants d'avance : 8 950 TND.\nClause résolutoire expresse : Résiliation de plein droit après 8 jours de sommation restée sans effet, obligation de restitution immédiate sous astreinte.`
      },
      {
        id: 'doc-pre-leasing-2',
        name: 'TLF_Situation_Loyers_Impayes.xlsx',
        size: 310000,
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        extractedText: `DÉCOMPTE FINANCIER TLF - DOSSIER LSG-2022-44\nLoyers impayés échus : 71 600.000 TND (8 loyers de retard)\nIndemnité de résiliation conventionnelle (art. 14) : 95 000.000 TND\nIntérêts de retard moratoires : 7 850.000 TND\nTotal exigible : 174 450.000 TND\nLocalisation matérielle : Zone Industrielle Poudrière II, Sfax.`
      }
    ]
  }
];

interface NouveauDossierModuleProps {
  onDossierCreated?: (newCase: LegalCase) => void;
  onClose?: () => void;
  userEmail?: string;
}

export default function NouveauDossierModule({
  onDossierCreated,
  onClose,
  userEmail
}: NouveauDossierModuleProps) {
  // Navigation tabs in creation wizard
  const [activeStep, setActiveStep] = useState<'upload' | 'form' | 'analysis' | 'summary'>('upload');

  // Multi-files list
  const [uploadedFiles, setUploadedFiles] = useState<UploadedDoc[]>([]);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form Fields State with origin tracking
  const [reference, setReference] = useState<FieldMeta<string>>({
    value: `DOS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    origin: 'manual'
  });
  const [creationDate, setCreationDate] = useState<FieldMeta<string>>({
    value: new Date().toISOString().slice(0, 10),
    origin: 'manual'
  });
  const [clientName, setClientName] = useState<FieldMeta<string>>({
    value: '',
    origin: 'manual'
  });
  const [clientIdentifier, setClientIdentifier] = useState<FieldMeta<string>>({
    value: '',
    origin: 'manual'
  });
  const [clientCity, setClientCity] = useState<FieldMeta<string>>({
    value: 'Tunis',
    origin: 'manual'
  });
  const [clientPhone, setClientPhone] = useState<FieldMeta<string>>({
    value: '',
    origin: 'manual'
  });

  const [dossierType, setDossierType] = useState<FieldMeta<'Contentieux' | 'Pré-contentieux' | 'Recouvrement amiable' | 'Leasing' | 'Factoring' | 'Microfinance'>>({
    value: 'Contentieux',
    origin: 'manual'
  });
  const [subCategory, setSubCategory] = useState<FieldMeta<string>>({
    value: 'Injonction de payer (Art. 258 CPCC)',
    origin: 'manual'
  });
  const [institution, setInstitution] = useState<FieldMeta<string>>({
    value: 'Société Tunisienne de Banque (STB)',
    origin: 'manual'
  });
  const [branch, setBranch] = useState<FieldMeta<string>>({
    value: 'Direction du Contentieux / Siège Tunis',
    origin: 'manual'
  });

  // Financial fields
  const [principalAmount, setPrincipalAmount] = useState<FieldMeta<number>>({
    value: 0,
    origin: 'manual'
  });
  const [interestAmount, setInterestAmount] = useState<FieldMeta<number>>({
    value: 0,
    origin: 'manual'
  });
  const [penaltiesAmount, setPenaltiesAmount] = useState<FieldMeta<number>>({
    value: 0,
    origin: 'manual'
  });
  const [claimNature, setClaimNature] = useState<FieldMeta<string>>({
    value: 'Crédit bancaire professionnel exigible suite déchéance du terme',
    origin: 'manual'
  });
  const [priority, setPriority] = useState<FieldMeta<'Normale' | 'Haute' | 'Urgente'>>({
    value: 'Haute',
    origin: 'manual'
  });
  const [dossierStatus, setDossierStatus] = useState<FieldMeta<string>>({
    value: 'En cours d\'instruction',
    origin: 'manual'
  });

  // Legal & Guarantees
  const [guarantees, setGuarantees] = useState<FieldMeta<string>>({
    value: '',
    origin: 'manual'
  });
  const [importantDeadlines, setImportantDeadlines] = useState<FieldMeta<string>>({
    value: '',
    origin: 'manual'
  });
  const [legalJurisdiction, setLegalJurisdiction] = useState<FieldMeta<string>>({
    value: 'Tribunal de Première Instance de Tunis',
    origin: 'manual'
  });
  const [assignedLawyer, setAssignedLawyer] = useState<FieldMeta<string>>({
    value: 'Cabinet Me Sami Zouari (Barreau de Tunis)',
    origin: 'manual'
  });
  const [assignedBailiff, setAssignedBailiff] = useState<FieldMeta<string>>({
    value: 'Étude d\'huissier de justice Me M. Trabelsi',
    origin: 'manual'
  });
  const [dossierOfficer, setDossierOfficer] = useState<FieldMeta<string>>({
    value: userEmail || 'juriste.contentieux@recovai.com',
    origin: 'manual'
  });
  const [observations, setObservations] = useState<FieldMeta<string>>({
    value: '',
    origin: 'manual'
  });

  // Dynamic fields according to portfolio/type
  const [leasingAssetType, setLeasingAssetType] = useState<FieldMeta<string>>({
    value: 'Véhicules industriels / Flotte commerciale',
    origin: 'manual'
  });
  const [leasingResidualValue, setLeasingResidualValue] = useState<FieldMeta<number>>({
    value: 1,
    origin: 'manual'
  });
  const [factoringDebtorName, setFactoringDebtorName] = useState<FieldMeta<string>>({
    value: '',
    origin: 'manual'
  });
  const [microfinanceGuarantor, setMicrofinanceGuarantor] = useState<FieldMeta<string>>({
    value: '',
    origin: 'manual'
  });

  // AI Analysis states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStepLabel, setAnalysisStepLabel] = useState('');
  const [aiReport, setAiReport] = useState<AIAnalysisReport | null>(null);

  // Total amount computed
  const totalAmountCalculated = (Number(principalAmount.value) || 0) + (Number(interestAmount.value) || 0) + (Number(penaltiesAmount.value) || 0);

  // ─── FILE UPLOAD HANDLERS ───────────────────────────────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsReadingFile(true);
    const newDocs: UploadedDoc[] = [];

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string || '';
        // basic text extraction or metadata description
        const snippet = text.slice(0, 300).replace(/[^\x20-\x7E\xA0-\xFF\n\r\t]/g, ' ');
        newDocs.push({
          id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          name: file.name,
          size: file.size,
          type: file.type || 'Fichier documentaire',
          extractedText: text || `Fichier ${file.name} téléversé avec succès. Taille : ${(file.size / 1024).toFixed(1)} Ko.`,
          previewSnippet: snippet
        });

        if (newDocs.length === files.length) {
          setUploadedFiles((prev) => [...prev, ...newDocs]);
          setIsReadingFile(false);
          toast({
            title: 'Documents importés',
            description: `${files.length} document(s) prêt(s) pour l'analyse intelligente IA.`
          });
        }
      };

      if (file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.csv')) {
        reader.readAsText(file);
      } else {
        // Read as arrayBuffer/dataUrl to capture file existence
        reader.readAsDataURL(file);
      }
    });
  };

  const removeDoc = (id: string) => {
    setUploadedFiles((prev) => prev.filter(d => d.id !== id));
  };

  const loadPresetPack = (packIndex: number) => {
    const pack = PRESET_DOCUMENTS_PACKS[packIndex];
    if (!pack) return;
    setUploadedFiles(pack.files);
    toast({
      title: 'Pack documentaire chargé',
      description: `${pack.label} a été injecté dans la zone d'analyse.`
    });
  };

  // ─── AI ANALYSIS TRIGGER ─────────────────────────────────────────
  const triggerAiAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisStepLabel('Extraction du contenu des fichiers PDF/Word/Excel...');

    const steps = [
      'Lecture et parsing des pièces justificatives...',
      'Identification des parties contractuelles et débiteurs...',
      'Calcul du quantum de la créance et intérêts moratoires...',
      'Contrôle de conformité de l\'art. 258 du CPCC tunisien...',
      'Détection des sûretés inscrites et des pièces manquantes...',
      'Audit des risques et consolidation des actions juridiques...'
    ];

    let stepIndex = 0;
    const interval = setInterval(() => {
      stepIndex++;
      if (stepIndex < steps.length) {
        setAnalysisStepLabel(steps[stepIndex]);
      }
    }, 600);

    try {
      const payload = {
        manualData: {
          reference: reference.value,
          creationDate: creationDate.value,
          clientName: clientName.value,
          clientIdentifier: clientIdentifier.value,
          clientCity: clientCity.value,
          dossierType: dossierType.value,
          subCategory: subCategory.value,
          institution: institution.value,
          branch: branch.value,
          principalAmount: principalAmount.value,
          interestAmount: interestAmount.value,
          penaltiesAmount: penaltiesAmount.value,
          claimNature: claimNature.value,
          priority: priority.value,
          legalJurisdiction: legalJurisdiction.value,
          assignedLawyer: assignedLawyer.value,
          assignedBailiff: assignedBailiff.value,
          guarantees: guarantees.value,
          observations: observations.value,
          leasingAssetType: leasingAssetType.value,
          leasingResidualValue: leasingResidualValue.value,
          factoringDebtorName: factoringDebtorName.value,
          microfinanceGuarantor: microfinanceGuarantor.value
        },
        documents: uploadedFiles
      };

      const response = await authorizedFetch('/api/contentieux/nouveau-dossier/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      clearInterval(interval);

      if (!response.ok) {
        throw new Error('Erreur lors de la génération de l\'analyse intelligente.');
      }

      const resData = await response.json();
      const report: AIAnalysisReport = resData.data;
      setAiReport(report);

      // Pre-fill form fields if suggestions exist and user hasn't typed anything
      if (report.preRemplissageSuggere) {
        const p = report.preRemplissageSuggere;
        if (p.clientName && (!clientName.value || clientName.origin === 'ai_extracted')) {
          setClientName({
            value: p.clientName.value,
            origin: 'ai_extracted',
            sourceDoc: p.clientName.source,
            confidence: p.clientName.confidence
          });
        }
        if (p.principalAmount && (principalAmount.value === 0 || principalAmount.origin === 'ai_extracted')) {
          setPrincipalAmount({
            value: Number(p.principalAmount.value),
            origin: 'ai_extracted',
            sourceDoc: p.principalAmount.source,
            confidence: p.principalAmount.confidence
          });
        }
        if (p.interestAmount && (interestAmount.value === 0 || interestAmount.origin === 'ai_extracted')) {
          setInterestAmount({
            value: Number(p.interestAmount.value),
            origin: 'ai_extracted',
            sourceDoc: p.interestAmount.source,
            confidence: p.interestAmount.confidence
          });
        }
        if (p.penaltiesAmount && (penaltiesAmount.value === 0 || penaltiesAmount.origin === 'ai_extracted')) {
          setPenaltiesAmount({
            value: Number(p.penaltiesAmount.value),
            origin: 'ai_extracted',
            sourceDoc: p.penaltiesAmount.source,
            confidence: p.penaltiesAmount.confidence
          });
        }
        if (p.guarantees && (!guarantees.value || guarantees.origin === 'ai_extracted')) {
          setGuarantees({
            value: p.guarantees.value,
            origin: 'ai_extracted',
            sourceDoc: p.guarantees.source,
            confidence: p.guarantees.confidence
          });
        }
        if (p.legalJurisdiction && (!legalJurisdiction.value || legalJurisdiction.origin === 'ai_extracted')) {
          setLegalJurisdiction({
            value: p.legalJurisdiction.value,
            origin: 'ai_extracted',
            sourceDoc: p.legalJurisdiction.source,
            confidence: p.legalJurisdiction.confidence
          });
        }
        if (p.subCategory && subCategory.origin === 'manual') {
          setSubCategory({
            value: p.subCategory.value,
            origin: 'ai_extracted',
            sourceDoc: p.subCategory.source,
            confidence: p.subCategory.confidence
          });
        }
      }

      // Log in Litigation store
      LitigationStore.logAction(
        userEmail || 'user@recovai.com',
        'Analyse Intelligente IA',
        `Constitution du nouveau dossier ${reference.value} : extraction réussie sur ${uploadedFiles.length} document(s)`
      );

      toast({
        title: 'Analyse IA terminée',
        description: 'La fiche synthétique et les recommandations juridiques ont été générées avec succès.'
      });

      setActiveStep('analysis');
    } catch (err: any) {
      clearInterval(interval);
      console.error(err);
      toast({
        title: 'Alerte analyse',
        description: err.message || 'Impossible d\'effectuer l\'analyse.',
        variant: 'destructive'
      });
    } finally {
      setIsAnalyzing(false);
      setAnalysisStepLabel('');
    }
  };

  // ─── ACTION ITEM TOGGLE / VALIDATION ────────────────────────────
  const toggleActionStatus = (actionId: string, newStatus: 'propose' | 'valide' | 'rejete') => {
    if (!aiReport) return;
    setAiReport({
      ...aiReport,
      actionsAEntreprendre: aiReport.actionsAEntreprendre.map(act => 
        act.id === actionId ? { ...act, statut: newStatus } : act
      )
    });
  };

  const validateAllAiFields = () => {
    setClientName(prev => ({ ...prev, origin: 'user_validated' }));
    setPrincipalAmount(prev => ({ ...prev, origin: 'user_validated' }));
    setInterestAmount(prev => ({ ...prev, origin: 'user_validated' }));
    setPenaltiesAmount(prev => ({ ...prev, origin: 'user_validated' }));
    setGuarantees(prev => ({ ...prev, origin: 'user_validated' }));
    setLegalJurisdiction(prev => ({ ...prev, origin: 'user_validated' }));
    setSubCategory(prev => ({ ...prev, origin: 'user_validated' }));
    toast({
      title: 'Données validées',
      description: 'Toutes les informations extraites par l\'IA ont été formellement validées.'
    });
  };

  // ─── FINAL SAVE DOSSIER HANDLER ─────────────────────────────────
  const handleSaveAndCreateCase = async () => {
    if (!clientName.value.trim()) {
      toast({
        title: 'Information manquante',
        description: 'Veuillez saisir le nom ou la raison sociale de la contrepartie débitrice.',
        variant: 'destructive'
      });
      setActiveStep('form');
      return;
    }

    const newCaseId = reference.value || `LIT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // 1. Build LegalCase object
    const createdLegalCase: LegalCase = {
      id: newCaseId,
      client_name: clientName.value,
      portfolio_type: (dossierType.value === 'Leasing' ? 'Leasing' : dossierType.value === 'Factoring' ? 'Factoring' : 'Microfinance'),
      institution: institution.value,
      branch: branch.value,
      legal_case_number: `RG-${new Date().getFullYear()}/${Math.floor(100 + Math.random() * 900)}`,
      legal_officer_id: dossierOfficer.value,
      external_lawyer_id: assignedLawyer.value,
      principal_due: principalAmount.value,
      interest_due: interestAmount.value,
      penalties_due: penaltiesAmount.value,
      legal_fees_due: 1500,
      recoverable_fees: 1500,
      total_claim_amount: totalAmountCalculated,
      recovered_amount: 0,
      remaining_amount: totalAmountCalculated,
      recovery_rate: 0,
      risk_level: priority.value === 'Urgente' ? 'Critique' : priority.value === 'Haute' ? 'Élevé' : 'Moyen',
      priority_level: priority.value,
      status: 'opened',
      opened_at: creationDate.value,
      has_collateral: !!guarantees.value,
      has_guarantor: true,
      missing_docs_count: aiReport ? aiReport.analyseDocumentaire.documentsManquants.length : 1
    };

    // 2. Persist in LitigationStore
    const legalCases = LitigationStore.getLegalCases();
    legalCases.unshift(createdLegalCase);
    LitigationStore.saveLegalCases(legalCases);

    // 3. Persist documents
    if (uploadedFiles.length > 0) {
      const existingDocs = LitigationStore.getLegalDocuments();
      uploadedFiles.forEach((file, idx) => {
        const docRecord: LegalDocument = {
          id: `DOC-${Date.now()}-${idx}`,
          case_id: newCaseId,
          title: file.name,
          category: file.name.toLowerCase().includes('contrat') ? 'Contrat de prêt' : file.name.toLowerCase().includes('mise') ? 'Mise en demeure' : 'Pièce comptable',
          doc_type: 'Acte authentique',
          file_url: `/documents/${file.name}`,
          uploaded_at: new Date().toISOString().slice(0, 10),
          uploaded_by: userEmail || 'juriste.recovai@bank.tn',
          verified: true,
          verification_notes: 'Document inspecté et extrait par l\'assistant d\'analyse IA',
          page_count: 5,
          legal_status: 'valid'
        };
        existingDocs.unshift(docRecord);
      });
      LitigationStore.saveLegalDocuments(existingDocs);
    }

    // 4. Persist Collaterals if declared
    if (guarantees.value) {
      const existingCollaterals = LitigationStore.getCollaterals();
      const newCollateral: Collateral = {
        id: `GAR-${Date.now()}`,
        case_id: newCaseId,
        type: guarantees.value.toLowerCase().includes('hypo') ? 'Hypothèque 1er rang' : 'Nantissement matériel',
        description: guarantees.value,
        estimated_value: principalAmount.value * 1.3,
        expert_valuation: principalAmount.value * 1.3,
        valuation_date: creationDate.value,
        status: 'active',
        is_realizable: true,
        legal_notes: 'Sûreté validée lors de la constitution du dossier'
      };
      existingCollaterals.unshift(newCollateral);
      LitigationStore.saveCollaterals(existingCollaterals);
    }

    // 5. Persist Actions from AI Report
    if (aiReport && aiReport.actionsAEntreprendre.length > 0) {
      const existingActions = LitigationStore.getLegalActions();
      aiReport.actionsAEntreprendre
        .filter(act => act.statut === 'valide' || act.statut === 'propose')
        .forEach((act, idx) => {
          const actionRecord: LegalAction = {
            id: `ACT-${Date.now()}-${idx}`,
            case_id: newCaseId,
            action_type: 'Assignation fond',
            title: act.action,
            actor_name: act.responsable,
            target_entity: clientName.value,
            scheduled_date: new Date(Date.now() + (idx + 1) * 7 * 86400000).toISOString().slice(0, 10),
            status: 'draft',
            priority: act.priorite,
            estimated_cost: 450,
            actual_cost: 0,
            court_name: legalJurisdiction.value,
            bailiff_id: assignedBailiff.value,
            notes: `Échéance suggérée : ${act.echeance}. Statut validation : ${act.statut}`
          };
          existingActions.unshift(actionRecord);
        });
      LitigationStore.saveLegalActions(existingActions);
    }

    // 6. Log in audit
    LitigationStore.logAction(
      userEmail || 'user@recovai.com',
      'Création nouveau dossier',
      `Le dossier ${newCaseId} pour ${clientName.value} a été validé et injecté dans le portefeuille contentieux.`
    );

    // Call backend endpoint for persistent database record
    try {
      await authorizedFetch('/api/contentieux/nouveau-dossier/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: newCaseId,
          clientName: clientName.value,
          dossierType: dossierType.value,
          principalAmount: principalAmount.value,
          totalAmount: totalAmountCalculated,
          institution: institution.value
        })
      });
    } catch (e) {
      // ignore server save error in offline mode
    }

    toast({
      title: 'Dossier créé avec succès !',
      description: `Le dossier ${newCaseId} a été ajouté au registre des dossiers contentieux.`
    });

    if (onDossierCreated) {
      onDossierCreated(createdLegalCase);
    }
  };

  // Helper Badge for origin indicator
  const renderOriginBadge = (fieldMeta: FieldMeta<any>, onValidateField?: () => void) => {
    if (fieldMeta.origin === 'user_validated') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <Check size={10} className="stroke-[3]" /> Validé
        </span>
      );
    }
    if (fieldMeta.origin === 'ai_extracted') {
      return (
        <div className="inline-flex items-center gap-1">
          <span 
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-800 border border-purple-300 cursor-help"
            title={`Extrait par l'IA de : ${fieldMeta.sourceDoc || 'Document'} (${fieldMeta.confidence || 90}% confiance)`}
          >
            <Sparkles size={10} className="text-purple-600 animate-pulse" /> Extrait IA
          </span>
          {onValidateField && (
            <button
              type="button"
              onClick={onValidateField}
              title="Valider cette information extraite"
              className="p-0.5 text-xs text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded transition"
            >
              <Check size={12} />
            </button>
          )}
        </div>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
        Manuel
      </span>
    );
  };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-lg overflow-hidden transition-all">
      {/* ─── HEADER DU MODULE NOUVEAUX DOSSIERS ─── */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white border-b border-border/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[11px] font-mono font-bold">
              <FolderPlus size={13} className="text-blue-400" />
              CONSTITUTION & ANALYSE DE NOUVEAUX DOSSIERS
            </div>
            <h2 className="text-2xl font-serif-display font-bold tracking-tight text-white flex items-center gap-2">
              Nouveau Dossier Contentieux & Recouvrement
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Importez vos pièces justificatives (PDF, Word, Excel) et laissez l'assistant IA extraire automatiquement les créances, identifier les sûretés, détecter les incohérences et suggérer les actions de poursuite.
            </p>
          </div>

          {/* Quick Action Buttons Header */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={triggerAiAnalysis}
              disabled={isAnalyzing || (uploadedFiles.length === 0 && !clientName.value)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white shadow-lg hover:brightness-110 transition disabled:opacity-50 cursor-pointer border border-white/20"
            >
              {isAnalyzing ? (
                <RefreshCw size={14} className="animate-spin text-white" />
              ) : (
                <Sparkles size={14} className="text-yellow-300 animate-pulse" />
              )}
              {isAnalyzing ? 'Analyse en cours...' : 'Analyse intelligente IA'}
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="px-3 py-2 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white rounded-xl transition cursor-pointer"
              >
                Fermer
              </button>
            )}
          </div>
        </div>

        {/* ─── WIZARD STEPS NAVIGATION ─── */}
        <div className="relative z-10 grid grid-cols-4 gap-2 mt-6 pt-4 border-t border-white/10">
          {[
            { id: 'upload', label: '1. Documents (PDF / Word / Excel)', icon: UploadCloud, count: uploadedFiles.length },
            { id: 'form', label: '2. Formulaire & Données', icon: Edit3, count: clientName.value ? 'Renseigné' : 'À remplir' },
            { id: 'analysis', label: '3. Analyse Intelligente IA', icon: Sparkles, count: aiReport ? 'Générée' : 'En attente' },
            { id: 'summary', label: '4. Synthèse & Validation', icon: ShieldCheck, count: 'Étape finale' }
          ].map((step) => {
            const Icon = step.icon;
            const isActive = activeStep === step.id;
            return (
              <button
                key={step.id}
                onClick={() => setActiveStep(step.id as any)}
                className={`p-3 rounded-xl text-left transition flex items-center gap-3 border ${
                  isActive
                    ? 'bg-white/15 border-blue-400 text-white shadow-sm ring-1 ring-blue-400'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                <div className={`p-2 rounded-lg ${isActive ? 'bg-blue-600 text-white' : 'bg-white/10 text-slate-400'}`}>
                  <Icon size={16} />
                </div>
                <div>
                  <div className="text-xs font-bold">{step.label}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">{step.count}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── ANALYSIS LOADING OVERLAY ─── */}
      <AnimatePresence>
        {isAnalyzing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-6 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white border-b border-white/10"
          >
            <div className="max-w-xl mx-auto text-center space-y-3">
              <div className="inline-flex p-3 rounded-full bg-white/10 text-yellow-300 animate-bounce">
                <Sparkles size={24} />
              </div>
              <h3 className="text-sm font-bold tracking-wide">Moteur d'Intelligence Cognitive Juridique BCT</h3>
              <p className="text-xs text-purple-200 font-mono animate-pulse">{analysisStepLabel}</p>
              <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                <motion.div 
                  className="bg-gradient-to-r from-yellow-400 via-purple-400 to-blue-400 h-full rounded-full"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── STEP 1 : DOCUMENTS IMPORT ─── */}
      {activeStep === 'upload' && (
        <div className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <UploadCloud className="text-blue-600" size={18} />
                Importation des pièces du dossier (PDF, Word, Excel)
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sélectionnez un ou plusieurs fichiers simultanément. L'IA examinera le contenu pour pré-remplir la fiche.
              </p>
            </div>

            {/* Presets quick load */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-muted-foreground">Exemples types :</span>
              <button
                type="button"
                onClick={() => loadPresetPack(0)}
                className="px-2.5 py-1 text-[11px] font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg transition"
              >
                Pack STB (Prêt)
              </button>
              <button
                type="button"
                onClick={() => loadPresetPack(1)}
                className="px-2.5 py-1 text-[11px] font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-lg transition"
              >
                Pack TLF (Leasing)
              </button>
            </div>
          </div>

          {/* Drag & Drop Area */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border hover:border-blue-500 bg-secondary/30 hover:bg-blue-50/20 rounded-2xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 group"
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              multiple 
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv" 
              className="hidden" 
              onChange={handleFileUpload} 
            />
            <div className="p-4 rounded-2xl bg-card shadow-sm border border-border group-hover:scale-105 transition">
              <UploadCloud size={32} className="text-blue-600" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-foreground">
                Cliquez pour parcourir ou glissez vos fichiers ici
              </p>
              <p className="text-xs text-muted-foreground">
                Formats acceptés : PDF (.pdf), Word (.docx, .doc), Excel (.xlsx, .xls)
              </p>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-mono text-muted-foreground mt-2">
              <span className="flex items-center gap-1">
                <FileText size={12} className="text-red-500" /> Contrats & Actes PDF
              </span>
              <span className="flex items-center gap-1">
                <FileSpreadsheet size={12} className="text-emerald-600" /> Décomptes Excel
              </span>
              <span className="flex items-center gap-1">
                <FileText size={12} className="text-blue-600" /> Mises en demeure Word
              </span>
            </div>
          </div>

          {/* Uploaded Documents Table */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                  Fichiers chargés ({uploadedFiles.length})
                </h4>
                <button
                  type="button"
                  onClick={() => setUploadedFiles([])}
                  className="text-xs text-red-600 hover:underline flex items-center gap-1 font-medium"
                >
                  <Trash2 size={12} /> Tout supprimer
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {uploadedFiles.map((doc) => {
                  const isPdf = doc.name.endsWith('.pdf');
                  const isXls = doc.name.endsWith('.xls') || doc.name.endsWith('.xlsx');
                  return (
                    <div 
                      key={doc.id}
                      className="p-3.5 rounded-xl border border-border bg-card shadow-sm flex items-start justify-between gap-3 group"
                    >
                      <div className="flex items-start gap-3 overflow-hidden">
                        <div className={`p-2 rounded-lg ${isPdf ? 'bg-red-50 text-red-600' : isXls ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                          {isXls ? <FileSpreadsheet size={16} /> : <FileText size={16} />}
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-foreground truncate" title={doc.name}>
                            {doc.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                            {(doc.size / 1024).toFixed(1)} Ko • Prêt pour analyse
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeDoc(doc.id); }}
                        className="text-muted-foreground hover:text-red-600 p-1 rounded transition"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Security & Confidentiality Banner */}
          <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 text-xs flex items-start gap-3">
            <ShieldCheck size={18} className="text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-blue-900 dark:text-blue-300">
                Sécurité bancaire, intégrité & traçabilité stricte :
              </span>
              <p className="text-blue-800/80 dark:text-blue-400 text-[11px] leading-relaxed">
                Les documents importés ne sont ni altérés ni modifiés. Les extractions générées par l'IA demeurent isolées sous forme de propositions soumises à la validation expresse du juriste avant tout enregistrement définitif.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <span className="text-xs text-muted-foreground font-mono">
              Étape suivante : vérification et complément du formulaire
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={triggerAiAnalysis}
                disabled={isAnalyzing || uploadedFiles.length === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white transition disabled:opacity-50"
              >
                <Sparkles size={14} />
                Lancer l'analyse IA
              </button>
              <button
                type="button"
                onClick={() => setActiveStep('form')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-foreground text-background hover:opacity-90 transition"
              >
                Accéder au formulaire <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── STEP 2 : STRUCTURED DYNAMIC FORM ─── */}
      {activeStep === 'form' && (
        <div className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Edit3 className="text-blue-600" size={18} />
                Fiche d'instruction du nouveau dossier
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Champs dynamiques adaptés à la nature du dossier. Contrôlez et validez les données extraites par l'IA.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={validateAllAiFields}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 transition"
              >
                <CheckCircle2 size={13} />
                Tout valider les données IA
              </button>
              <button
                type="button"
                onClick={triggerAiAnalysis}
                disabled={isAnalyzing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 transition"
              >
                <Sparkles size={13} />
                Ré-analyser par IA
              </button>
            </div>
          </div>

          <form className="space-y-6">
            {/* 1. Identification & Métadonnées */}
            <div className="bg-secondary/20 p-5 rounded-2xl border border-border/80 space-y-4">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-foreground">
                <Building2 size={15} className="text-blue-600" />
                1. Identification générale du dossier
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-foreground">Référence dossier</label>
                    {renderOriginBadge(reference)}
                  </div>
                  <input
                    type="text"
                    value={reference.value}
                    onChange={(e) => setReference({ value: e.target.value, origin: 'manual' })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-card font-mono font-bold"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-foreground">Date de constitution</label>
                    {renderOriginBadge(creationDate)}
                  </div>
                  <input
                    type="date"
                    value={creationDate.value}
                    onChange={(e) => setCreationDate({ value: e.target.value, origin: 'manual' })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-card"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-foreground">Niveau de priorité</label>
                    {renderOriginBadge(priority)}
                  </div>
                  <select
                    value={priority.value}
                    onChange={(e) => setPriority({ value: e.target.value as any, origin: 'manual' })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-card font-semibold"
                  >
                    <option value="Normale">Normale (Standard)</option>
                    <option value="Haute">Haute (Impayés &gt; 90j)</option>
                    <option value="Urgente">Urgente (Risque de prescription / insolvabilité)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-foreground">Type de dossier</label>
                    {renderOriginBadge(dossierType)}
                  </div>
                  <select
                    value={dossierType.value}
                    onChange={(e) => setDossierType({ value: e.target.value as any, origin: 'manual' })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-card font-bold"
                  >
                    <option value="Contentieux">Contentieux Judiciaire (Tribunal)</option>
                    <option value="Pré-contentieux">Pré-contentieux (Mise en demeure)</option>
                    <option value="Recouvrement amiable">Recouvrement Amiable</option>
                    <option value="Leasing">Crédit-Bail / Leasing</option>
                    <option value="Factoring">Affacturage / Factoring</option>
                    <option value="Microfinance">Microfinance</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-foreground">Sous-type / Procédure visée</label>
                    {renderOriginBadge(subCategory, () => setSubCategory(prev => ({ ...prev, origin: 'user_validated' })))}
                  </div>
                  <input
                    type="text"
                    value={subCategory.value}
                    onChange={(e) => setSubCategory({ value: e.target.value, origin: 'manual' })}
                    placeholder="Ex: Injonction de payer (Art. 258 CPCC)"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-card"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-foreground">Institution financière créancière</label>
                    {renderOriginBadge(institution)}
                  </div>
                  <select
                    value={institution.value}
                    onChange={(e) => setInstitution({ value: e.target.value, origin: 'manual' })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-card font-medium"
                  >
                    {TUNISIAN_INSTITUTIONS.map((inst) => (
                      <option key={inst.id} value={`${inst.fullName} (${inst.code})`}>
                        {inst.code} - {inst.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-foreground">Agence / Direction gestionnaire</label>
                    {renderOriginBadge(branch)}
                  </div>
                  <input
                    type="text"
                    value={branch.value}
                    onChange={(e) => setBranch({ value: e.target.value, origin: 'manual' })}
                    placeholder="Ex: Direction du Recouvrement et Contentieux"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-card"
                  />
                </div>
              </div>
            </div>

            {/* 2. Données Débiteur & Contrepartie */}
            <div className="bg-secondary/20 p-5 rounded-2xl border border-border/80 space-y-4">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-foreground">
                <Briefcase size={15} className="text-indigo-600" />
                2. Débiteur principal & Coordonnées
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-foreground">Nom / Raison sociale de la contrepartie</label>
                    {renderOriginBadge(clientName, () => setClientName(prev => ({ ...prev, origin: 'user_validated' })))}
                  </div>
                  <input
                    type="text"
                    value={clientName.value}
                    onChange={(e) => setClientName({ value: e.target.value, origin: 'manual' })}
                    placeholder="Ex: Société Maghrébine de Plasturgie SARL"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-card font-bold"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-foreground">Identifiant officiel (CIN / RNE / Matricule fiscal)</label>
                    {renderOriginBadge(clientIdentifier)}
                  </div>
                  <input
                    type="text"
                    value={clientIdentifier.value}
                    onChange={(e) => setClientIdentifier({ value: e.target.value, origin: 'manual' })}
                    placeholder="Ex: 0112982B ou CIN 04589211"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-card font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-foreground">Ville / Tribunal territorial</label>
                    {renderOriginBadge(clientCity)}
                  </div>
                  <input
                    type="text"
                    value={clientCity.value}
                    onChange={(e) => setClientCity({ value: e.target.value, origin: 'manual' })}
                    placeholder="Ex: Tunis, Sousse, Sfax, Bizerte..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-card"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-foreground">Contact téléphonique / Email</label>
                    {renderOriginBadge(clientPhone)}
                  </div>
                  <input
                    type="text"
                    value={clientPhone.value}
                    onChange={(e) => setClientPhone({ value: e.target.value, origin: 'manual' })}
                    placeholder="Ex: +216 71 888 999"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-card font-mono"
                  />
                </div>
              </div>
            </div>

            {/* 3. Données Financières & Quantum */}
            <div className="bg-secondary/20 p-5 rounded-2xl border border-border/80 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-black uppercase text-foreground">
                  <Coins size={15} className="text-emerald-600" />
                  3. Décompte de la créance & Exposition
                </div>
                <div className="text-xs font-bold font-mono text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
                  Total réclamé : {totalAmountCalculated.toLocaleString('fr-TN')} TND
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-foreground">Principal dû (TND)</label>
                    {renderOriginBadge(principalAmount, () => setPrincipalAmount(prev => ({ ...prev, origin: 'user_validated' })))}
                  </div>
                  <input
                    type="number"
                    value={principalAmount.value || ''}
                    onChange={(e) => setPrincipalAmount({ value: Number(e.target.value), origin: 'manual' })}
                    placeholder="0"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-card font-mono font-bold"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-foreground">Intérêts conventionnels & moratoires (TND)</label>
                    {renderOriginBadge(interestAmount, () => setInterestAmount(prev => ({ ...prev, origin: 'user_validated' })))}
                  </div>
                  <input
                    type="number"
                    value={interestAmount.value || ''}
                    onChange={(e) => setInterestAmount({ value: Number(e.target.value), origin: 'manual' })}
                    placeholder="0"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-card font-mono"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-foreground">Pénalités & frais engagés (TND)</label>
                    {renderOriginBadge(penaltiesAmount, () => setPenaltiesAmount(prev => ({ ...prev, origin: 'user_validated' })))}
                  </div>
                  <input
                    type="number"
                    value={penaltiesAmount.value || ''}
                    onChange={(e) => setPenaltiesAmount({ value: Number(e.target.value), origin: 'manual' })}
                    placeholder="0"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-card font-mono"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-foreground">Nature de la créance ou de l'opération</label>
                  {renderOriginBadge(claimNature)}
                </div>
                <input
                  type="text"
                  value={claimNature.value}
                  onChange={(e) => setClaimNature({ value: e.target.value, origin: 'manual' })}
                  placeholder="Ex: Prêt d'équipement industriel / Facilité de caisse / Crédit-bail résilié"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-card"
                />
              </div>
            </div>

            {/* 4. Sûretés & Informations Juridiques */}
            <div className="bg-secondary/20 p-5 rounded-2xl border border-border/80 space-y-4">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-foreground">
                <Scale size={15} className="text-amber-600" />
                4. Sûretés, garanties & Juridiction
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-foreground">Garanties & Sûretés disponibles</label>
                  {renderOriginBadge(guarantees, () => setGuarantees(prev => ({ ...prev, origin: 'user_validated' })))}
                </div>
                <textarea
                  rows={2}
                  value={guarantees.value}
                  onChange={(e) => setGuarantees({ value: e.target.value, origin: 'manual' })}
                  placeholder="Ex: Hypothèque conventionnelle de 1er rang inscrite à la CPF de Tunis + Caution personnelle et solidaire du gérant"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-card"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-foreground">Juridiction / Tribunal</label>
                    {renderOriginBadge(legalJurisdiction, () => setLegalJurisdiction(prev => ({ ...prev, origin: 'user_validated' })))}
                  </div>
                  <input
                    type="text"
                    value={legalJurisdiction.value}
                    onChange={(e) => setLegalJurisdiction({ value: e.target.value, origin: 'manual' })}
                    placeholder="Ex: Tribunal de Première Instance de Tunis"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-card font-medium"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-foreground">Avocat constitué</label>
                    {renderOriginBadge(assignedLawyer)}
                  </div>
                  <input
                    type="text"
                    value={assignedLawyer.value}
                    onChange={(e) => setAssignedLawyer({ value: e.target.value, origin: 'manual' })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-card"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-foreground">Huissier de justice mandataire</label>
                    {renderOriginBadge(assignedBailiff)}
                  </div>
                  <input
                    type="text"
                    value={assignedBailiff.value}
                    onChange={(e) => setAssignedBailiff({ value: e.target.value, origin: 'manual' })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-card"
                  />
                </div>
              </div>
            </div>

            {/* 5. CHAMPS DYNAMIQUES SELON LE TYPE DE DOSSIER */}
            {dossierType.value === 'Leasing' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-amber-500/10 p-5 rounded-2xl border border-amber-500/30 space-y-4"
              >
                <div className="flex items-center gap-2 text-xs font-black uppercase text-amber-700 dark:text-amber-400">
                  <Layers size={15} />
                  Spécificités Crédit-Bail / Leasing
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-foreground mb-1 block">Type de matériel financé</label>
                    <input
                      type="text"
                      value={leasingAssetType.value}
                      onChange={(e) => setLeasingAssetType({ value: e.target.value, origin: 'manual' })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-card"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-foreground mb-1 block">Valeur résiduelle conventionnelle (%)</label>
                    <input
                      type="number"
                      value={leasingResidualValue.value}
                      onChange={(e) => setLeasingResidualValue({ value: Number(e.target.value), origin: 'manual' })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-card font-mono"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {dossierType.value === 'Factoring' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-blue-500/10 p-5 rounded-2xl border border-blue-500/30 space-y-4"
              >
                <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-700 dark:text-blue-400">
                  <Layers size={15} />
                  Spécificités Affacturage / Factoring
                </div>
                <div>
                  <label className="text-xs font-bold text-foreground mb-1 block">Acheteur Cédé (Débiteur final de la facture)</label>
                  <input
                    type="text"
                    value={factoringDebtorName.value}
                    onChange={(e) => setFactoringDebtorName({ value: e.target.value, origin: 'manual' })}
                    placeholder="Nom du client final tenu au paiement de la facture subrogée"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-card"
                  />
                </div>
              </motion.div>
            )}

            {dossierType.value === 'Microfinance' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-emerald-500/10 p-5 rounded-2xl border border-emerald-500/30 space-y-4"
              >
                <div className="flex items-center gap-2 text-xs font-black uppercase text-emerald-700 dark:text-emerald-400">
                  <Layers size={15} />
                  Spécificités Microfinance
                </div>
                <div>
                  <label className="text-xs font-bold text-foreground mb-1 block">Caution Solidaire / Avaliste du microcrédit</label>
                  <input
                    type="text"
                    value={microfinanceGuarantor.value}
                    onChange={(e) => setMicrofinanceGuarantor({ value: e.target.value, origin: 'manual' })}
                    placeholder="Nom et CIN du garant ou membre du groupe solidaire"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-card"
                  />
                </div>
              </motion.div>
            )}

            {/* Observations */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-foreground">Observations & Contexte particulier</label>
                {renderOriginBadge(observations)}
              </div>
              <textarea
                rows={2}
                value={observations.value}
                onChange={(e) => setObservations({ value: e.target.value, origin: 'manual' })}
                placeholder="Renseignez tout élément utile (tentative de contact amiable, contestation reçue, etc.)"
                className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-card"
              />
            </div>
          </form>

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setActiveStep('upload')}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground transition"
            >
              ← Retour aux documents
            </button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={triggerAiAnalysis}
                disabled={isAnalyzing}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white transition shadow-sm"
              >
                <Sparkles size={14} />
                Lancer l'analyse IA
              </button>
              <button
                type="button"
                onClick={() => setActiveStep('summary')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-foreground text-background hover:opacity-90 transition"
              >
                Voir la synthèse <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── STEP 3 : AI ANALYSIS REPORT ─── */}
      {activeStep === 'analysis' && (
        <div className="p-6 space-y-6">
          {!aiReport ? (
            <div className="text-center py-12 space-y-4">
              <div className="p-4 rounded-full bg-purple-50 text-purple-600 inline-block">
                <Sparkles size={36} />
              </div>
              <h3 className="text-base font-bold text-foreground">Aucune analyse IA générée pour le moment</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Cliquez sur le bouton ci-dessous pour lancer l'audit intelligent sur vos documents et les informations saisies.
              </p>
              <button
                type="button"
                onClick={triggerAiAnalysis}
                disabled={isAnalyzing}
                className="px-6 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md hover:brightness-110 transition"
              >
                Lancer l'Analyse Intelligente IA
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header Analysis Summary */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-purple-500/10 p-5 rounded-2xl border border-purple-500/30">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                    Fiche d'Analyse Intelligente Juridique & Financière
                  </span>
                  <h3 className="text-lg font-bold text-foreground">
                    Audit IA du Dossier {reference.value} — {clientName.value || 'Contrepartie'}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Exposition analysée : <span className="font-bold text-foreground">{totalAmountCalculated.toLocaleString('fr-TN')} TND</span> • {uploadedFiles.length} document(s) inspecté(s)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={validateAllAiFields}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm"
                  >
                    <CheckCircle2 size={14} />
                    Valider toutes les données extraites
                  </button>
                </div>
              </div>

              {/* SECTION A : SYNTHÈSE DU DOSSIER */}
              <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
                <div className="flex items-center gap-2 text-xs font-black uppercase text-foreground border-b border-border pb-2">
                  <FileText size={16} className="text-blue-600" />
                  A. Synthèse exécutive du dossier
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1 p-3 rounded-xl bg-secondary/30">
                    <span className="font-bold text-muted-foreground">Résumé exécutif :</span>
                    <p className="text-foreground leading-relaxed">{aiReport.synthese.resumeExecutif}</p>
                  </div>
                  <div className="space-y-1 p-3 rounded-xl bg-secondary/30">
                    <span className="font-bold text-muted-foreground">Parties concernées :</span>
                    <p className="text-foreground leading-relaxed">{aiReport.synthese.parties}</p>
                  </div>
                  <div className="space-y-1 p-3 rounded-xl bg-secondary/30">
                    <span className="font-bold text-muted-foreground">Objet du litige :</span>
                    <p className="text-foreground leading-relaxed">{aiReport.synthese.objetDossier}</p>
                  </div>
                  <div className="space-y-1 p-3 rounded-xl bg-secondary/30">
                    <span className="font-bold text-muted-foreground">Situation actuelle :</span>
                    <p className="text-foreground leading-relaxed">{aiReport.synthese.situationActuelle}</p>
                  </div>
                </div>
              </div>

              {/* SECTION B : ANALYSE DOCUMENTAIRE & INCOHÉRENCES */}
              <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
                <div className="flex items-center gap-2 text-xs font-black uppercase text-foreground border-b border-border pb-2">
                  <FileCheck size={16} className="text-indigo-600" />
                  B. Analyse documentaire, conformité & Incohérences
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Pièces manquantes */}
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                    <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                      <AlertTriangle size={14} /> Pièces manquantes critiques ({aiReport.analyseDocumentaire.documentsManquants.length})
                    </span>
                    <ul className="text-xs space-y-2 text-amber-900/90 dark:text-amber-200">
                      {aiReport.analyseDocumentaire.documentsManquants.map((doc, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-amber-600 font-bold">•</span>
                          <span>{doc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Incohérences détectées */}
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 space-y-2">
                    <span className="text-xs font-bold text-red-800 dark:text-red-300 flex items-center gap-1.5">
                      <XOctagon size={14} /> Incohérences détectées ({aiReport.analyseDocumentaire.incoherencesDetectees.length})
                    </span>
                    <ul className="text-xs space-y-2 text-red-900/90 dark:text-red-200">
                      {aiReport.analyseDocumentaire.incoherencesDetectees.map((inc, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-red-600 font-bold">•</span>
                          <span>{inc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Points de vérification humaine */}
                  <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-2">
                    <span className="text-xs font-bold text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                      <HelpCircle size={14} /> Vérification humaine requise
                    </span>
                    <ul className="text-xs space-y-2 text-blue-900/90 dark:text-blue-200">
                      {aiReport.analyseDocumentaire.pointsVerificationHumaine.map((pt, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-blue-600 font-bold">•</span>
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Données extraites avec sources */}
                <div className="mt-4 pt-4 border-t border-border">
                  <h4 className="text-xs font-black uppercase text-muted-foreground mb-3">
                    Données clés extraites des documents
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-secondary/40 text-muted-foreground font-mono text-[10px] uppercase">
                        <tr>
                          <th className="p-2.5 rounded-l-lg">Champ</th>
                          <th className="p-2.5">Valeur extraite</th>
                          <th className="p-2.5">Document source & localisation</th>
                          <th className="p-2.5 text-center">Indice confiance</th>
                          <th className="p-2.5 text-right rounded-r-lg">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {aiReport.analyseDocumentaire.informationsExtraites.map((info, idx) => (
                          <tr key={idx} className="hover:bg-secondary/20 transition">
                            <td className="p-2.5 font-bold text-foreground">{info.champ}</td>
                            <td className="p-2.5 text-foreground">{info.valeur}</td>
                            <td className="p-2.5 font-mono text-[11px] text-muted-foreground">
                              {info.sourceDoc} {info.page && `(${info.page})`}
                            </td>
                            <td className="p-2.5 text-center">
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-100 text-purple-700">
                                {info.confiance}%
                              </span>
                            </td>
                            <td className="p-2.5 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  toast({
                                    title: 'Donnée confirmée',
                                    description: `Le champ ${info.champ} a été validé manuellement.`
                                  });
                                }}
                                className="px-2 py-1 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 transition"
                              >
                                Valider
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* SECTION C & D : JURIDIQUE & FINANCIER */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Analyse Juridique */}
                <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black uppercase text-foreground border-b border-border pb-2">
                    <Scale size={16} className="text-amber-600" />
                    C. Analyse juridique approfondie
                  </div>
                  <div className="text-xs space-y-3">
                    <div>
                      <span className="font-bold text-muted-foreground block mb-0.5">Engagements & Fondement :</span>
                      <p className="text-foreground leading-relaxed">{aiReport.analyseJuridique.engagementsContractuels}</p>
                    </div>
                    <div>
                      <span className="font-bold text-muted-foreground block mb-0.5">Sûretés & Rangs :</span>
                      <p className="text-foreground leading-relaxed">{aiReport.analyseJuridique.garantiesSuretes}</p>
                    </div>
                    <div>
                      <span className="font-bold text-muted-foreground block mb-0.5">Clauses critiques :</span>
                      <p className="text-foreground leading-relaxed">{aiReport.analyseJuridique.clausesImportantes}</p>
                    </div>
                    <div>
                      <span className="font-bold text-amber-600 dark:text-amber-400 block mb-0.5">Risques juridiques & Délais :</span>
                      <p className="text-foreground leading-relaxed">{aiReport.analyseJuridique.risquesJuridiques}</p>
                    </div>
                  </div>
                </div>

                {/* Analyse Financière */}
                <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black uppercase text-foreground border-b border-border pb-2">
                    <Coins size={16} className="text-emerald-600" />
                    D. Analyse financière & Couverture
                  </div>
                  <div className="text-xs space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 rounded-xl bg-secondary/30">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block">Principal dû</span>
                        <span className="text-sm font-bold font-mono text-foreground">{aiReport.analyseFinanciere.montantPrincipal.toLocaleString('fr-TN')} TND</span>
                      </div>
                      <div className="p-3 rounded-xl bg-secondary/30">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block">Intérêts & Frais</span>
                        <span className="text-sm font-bold font-mono text-foreground">{aiReport.analyseFinanciere.interetsFrais.toLocaleString('fr-TN')} TND</span>
                      </div>
                    </div>
                    <div>
                      <span className="font-bold text-muted-foreground block mb-0.5">Échéances en souffrance :</span>
                      <p className="text-foreground leading-relaxed">{aiReport.analyseFinanciere.echeances}</p>
                    </div>
                    <div>
                      <span className="font-bold text-muted-foreground block mb-0.5">Valeur des garanties :</span>
                      <p className="text-foreground leading-relaxed">{aiReport.analyseFinanciere.garantiesFinancieres}</p>
                    </div>
                    <div>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 block mb-0.5">Ratio de couverture :</span>
                      <p className="text-foreground leading-relaxed">{aiReport.analyseFinanciere.ratiosEvaluation}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION E : ANALYSE DES RISQUES */}
              <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
                <div className="flex items-center gap-2 text-xs font-black uppercase text-foreground border-b border-border pb-2">
                  <AlertCircle size={16} className="text-red-600" />
                  E. Matrice d'analyse des risques contentieux
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-secondary/40 text-muted-foreground font-mono text-[10px] uppercase">
                      <tr>
                        <th className="p-2.5 rounded-l-lg">Risque identifié</th>
                        <th className="p-2.5 text-center">Niveau</th>
                        <th className="p-2.5">Justification factuelle</th>
                        <th className="p-2.5">Source</th>
                        <th className="p-2.5 rounded-r-lg">Action recommandée</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {aiReport.analyseRisques.map((rk, idx) => {
                        const levelColors = {
                          Faible: 'bg-emerald-100 text-emerald-800',
                          Modéré: 'bg-blue-100 text-blue-800',
                          Élevé: 'bg-amber-100 text-amber-800',
                          Critique: 'bg-red-100 text-red-800'
                        };
                        return (
                          <tr key={idx} className="hover:bg-secondary/20 transition">
                            <td className="p-2.5 font-bold text-foreground">{rk.risque}</td>
                            <td className="p-2.5 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${levelColors[rk.niveau] || 'bg-gray-100 text-gray-800'}`}>
                                {rk.niveau}
                              </span>
                            </td>
                            <td className="p-2.5 text-foreground">{rk.justification}</td>
                            <td className="p-2.5 font-mono text-[10px] text-muted-foreground">{rk.documentSource}</td>
                            <td className="p-2.5 font-semibold text-blue-600 dark:text-blue-400">{rk.actionRecommandee}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION F : ACTIONS À ENTREPRENDRE (INTERACTIF) */}
              <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <div className="flex items-center gap-2 text-xs font-black uppercase text-foreground">
                    <Clock size={16} className="text-purple-600" />
                    F. Plan d'actions à entreprendre recommandé (Contrôle humain)
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    Validez, modifiez ou rejetez chaque action suggérée
                  </span>
                </div>

                <div className="space-y-2.5">
                  {aiReport.actionsAEntreprendre.map((act) => {
                    const isValide = act.statut === 'valide';
                    const isRejete = act.statut === 'rejete';
                    return (
                      <div
                        key={act.id}
                        className={`p-3.5 rounded-xl border transition flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                          isValide 
                            ? 'bg-emerald-50/50 border-emerald-300 dark:bg-emerald-950/20' 
                            : isRejete 
                            ? 'bg-neutral-100 border-neutral-200 opacity-60 dark:bg-neutral-900' 
                            : 'bg-card border-border hover:border-purple-300'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                              act.priorite === 'Urgente' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {act.priorite}
                            </span>
                            <span className="text-xs font-bold text-foreground">{act.action}</span>
                          </div>
                          <div className="flex items-center gap-4 text-[10px] text-muted-foreground font-mono">
                            <span>Échéance : <strong className="text-foreground">{act.echeance}</strong></span>
                            <span>Responsable : <strong className="text-foreground">{act.responsable}</strong></span>
                            <span>Statut : <strong className={isValide ? 'text-emerald-600 font-bold' : isRejete ? 'text-red-500 font-bold' : 'text-purple-600'}>{act.statut.toUpperCase()}</strong></span>
                          </div>
                        </div>

                        {/* Interactive Action Buttons */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => toggleActionStatus(act.id, 'valide')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                              isValide 
                                ? 'bg-emerald-600 text-white' 
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300'
                            }`}
                          >
                            <Check size={12} /> Valider
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleActionStatus(act.id, 'rejete')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                              isRejete 
                                ? 'bg-red-600 text-white' 
                                : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-300'
                            }`}
                          >
                            <X size={12} /> Rejeter
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setActiveStep('form')}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground transition"
                >
                  ← Ajuster le formulaire
                </button>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveStep('summary')}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-foreground text-background hover:opacity-90 transition shadow-sm"
                  >
                    Voir la fiche récapitulative <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── STEP 4 : TABLEAU DE SYNTHÈSE DU DOSSIER & FINAL ENREGISTREMENT ─── */}
      {activeStep === 'summary' && (
        <div className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <ShieldCheck className="text-emerald-600" size={18} />
                Fiche de synthèse du dossier — Contrôle avant transmission
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Parcours complet : Dossier → Parties → Montants → Documents → Garanties → Risques → Informations manquantes → Actions à entreprendre → Statut
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground transition"
              >
                <Printer size={13} /> Imprimer la fiche
              </button>
            </div>
          </div>

          {/* Sequential Workflow Pipeline Card */}
          <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl space-y-6 relative overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-blue-400">RÉFÉRENCE LÉGALE</span>
                <h4 className="text-xl font-bold font-serif-display text-white">{reference.value}</h4>
                <p className="text-xs text-slate-300">{institution.value} • {branch.value}</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">EXPOSITION GLOBALE</span>
                  <div className="text-lg font-black text-emerald-400 font-mono">
                    {totalAmountCalculated.toLocaleString('fr-TN')} TND
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  {priority.value}
                </span>
              </div>
            </div>

            {/* Pipeline Steps Flow */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">1. PARTIES</span>
                <div className="font-bold text-white text-sm">{clientName.value || 'Contrepartie non définie'}</div>
                <div className="text-slate-300 text-[11px]">ID : {clientIdentifier.value || 'N/A'} • Ville : {clientCity.value}</div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">2. CRÉANCE</span>
                <div className="font-bold text-white text-sm">Principal : {principalAmount.value.toLocaleString('fr-TN')} TND</div>
                <div className="text-slate-300 text-[11px]">Intérêts & pénalités : {((Number(interestAmount.value) || 0) + (Number(penaltiesAmount.value) || 0)).toLocaleString('fr-TN')} TND</div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">3. SÛRETÉS & ACTES</span>
                <div className="font-bold text-white text-sm truncate">{guarantees.value || 'Aucune garantie enregistrée'}</div>
                <div className="text-slate-300 text-[11px]">{uploadedFiles.length} document(s) inspecté(s)</div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">4. JURIDICTION</span>
                <div className="font-bold text-white text-sm truncate">{legalJurisdiction.value}</div>
                <div className="text-slate-300 text-[11px] truncate">Avocat : {assignedLawyer.value}</div>
              </div>
            </div>

            {/* AI Findings Summary in Pipeline */}
            {aiReport && (
              <div className="pt-4 border-t border-white/10 space-y-3">
                <span className="text-[10px] font-mono font-bold uppercase text-purple-300 flex items-center gap-1.5">
                  <Sparkles size={12} /> SYNTHÈSE DE L'AUDIT IA
                </span>
                <p className="text-xs text-slate-200 leading-relaxed bg-white/5 p-3 rounded-xl border border-white/10">
                  {aiReport.synthese.resumeExecutif}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200">
                    <strong className="block text-red-300 font-bold mb-1">Pièces manquantes détectées :</strong>
                    {aiReport.analyseDocumentaire.documentsManquants.slice(0, 2).map((d, i) => (
                      <div key={i} className="text-[11px]">• {d}</div>
                    ))}
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-200">
                    <strong className="block text-emerald-300 font-bold mb-1">Actions validées à exécuter :</strong>
                    {aiReport.actionsAEntreprendre.filter(a => a.statut === 'valide' || a.statut === 'propose').slice(0, 2).map((a, i) => (
                      <div key={i} className="text-[11px]">• {a.action} ({a.echeance})</div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Validation & Transmission Actions */}
          <div className="p-6 rounded-2xl bg-secondary/30 border border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600" />
                Dossier prêt pour enregistrement et transmission
              </h4>
              <p className="text-xs text-muted-foreground">
                L'enregistrement créera le dossier dans le registre officiel des contentieux et planifiera les premières actions judiciaires.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveStep('form')}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground transition"
              >
                Modifier les informations
              </button>
              <button
                type="button"
                onClick={handleSaveAndCreateCase}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-lg hover:brightness-110 transition cursor-pointer"
              >
                <Save size={14} />
                Enregistrer & Transmettre au Contentieux
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
