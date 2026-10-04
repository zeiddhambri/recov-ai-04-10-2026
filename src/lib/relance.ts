// Moteur de relance automatisé - Types et logique
import { ClientClassification } from './scoring';

export type RelanceCanal = 'sms' | 'email' | 'whatsapp' | 'appel';

export interface RelanceEtape {
  id: string;
  jour: number;          // J-5, J+1, J+7, etc. (relatif à l'échéance)
  canal: RelanceCanal;
  titre: string;
  message: string;
  conditionScore?: { min?: number; max?: number };  // Condition basée sur le score
  conditionClassification?: ClientClassification[];  // Condition basée sur la classification
  estObligatoire: boolean;
}

export interface RelanceScenario {
  id: string;
  nom: string;
  description: string;
  cibleClassification: ClientClassification[];
  etapes: RelanceEtape[];
  arretSiPaiement: boolean;
  actif: boolean;
}

export type RelanceStatut = 'planifiee' | 'envoyee' | 'echouee' | 'annulee' | 'repondue';

export interface RelanceExecution {
  id: string;
  dossierId: string;
  scenarioId: string;
  etapeId: string;
  canal: RelanceCanal;
  statut: RelanceStatut;
  dateEnvoi: string;
  dateReponse?: string;
  commentaire?: string;
}

// Canal config
export const canalConfig: Record<RelanceCanal, { label: string; emoji: string; color: string }> = {
  sms: { label: 'SMS', emoji: '💬', color: 'text-sky bg-sky/10' },
  email: { label: 'Email', emoji: '📧', color: 'text-purple-600 bg-purple-50' },
  whatsapp: { label: 'WhatsApp', emoji: '📱', color: 'text-green-600 bg-green-50' },
  appel: { label: 'Appel', emoji: '📞', color: 'text-gold bg-gold/10' },
};

export const statutRelanceConfig: Record<RelanceStatut, { label: string; color: string }> = {
  planifiee: { label: 'Planifiée', color: 'text-muted-foreground bg-muted' },
  envoyee: { label: 'Envoyée', color: 'text-sky bg-sky/10' },
  echouee: { label: 'Échouée', color: 'text-destructive bg-destructive/10' },
  annulee: { label: 'Annulée', color: 'text-muted-foreground bg-muted' },
  repondue: { label: 'Répondue', color: 'text-green-600 bg-green-50' },
};

// Mock scenarios
export const mockScenarios: RelanceScenario[] = [
  {
    id: 'sc-1',
    nom: 'Relance Standard',
    description: 'Scénario de relance progressive pour les clients fiables et à surveiller.',
    cibleClassification: ['fiable', 'a_surveiller'],
    arretSiPaiement: true,
    actif: true,
    etapes: [
      { id: 'e1', jour: -5, canal: 'sms', titre: 'Rappel avant échéance', message: 'Votre échéance de {montant} TND arrive dans 5 jours.', estObligatoire: true },
      { id: 'e2', jour: 1, canal: 'email', titre: 'Relance post-échéance', message: 'Votre paiement de {montant} TND est en retard d\'un jour.', estObligatoire: true },
      { id: 'e3', jour: 7, canal: 'sms', titre: 'Relance J+7', message: 'Rappel : votre paiement est en retard de 7 jours.', estObligatoire: true },
      { id: 'e4', jour: 15, canal: 'appel', titre: 'Appel de relance', message: 'Appel pour discuter du règlement de la créance.', estObligatoire: false, conditionClassification: ['a_surveiller'] },
      { id: 'e5', jour: 20, canal: 'email', titre: 'Mise en demeure', message: 'Mise en demeure formelle avant transfert en contentieux.', estObligatoire: true },
    ],
  },
  {
    id: 'sc-2',
    nom: 'Relance Intensive',
    description: 'Scénario agressif pour les clients à risque avec relances multicanaux rapprochées.',
    cibleClassification: ['a_risque'],
    arretSiPaiement: true,
    actif: true,
    etapes: [
      { id: 'e6', jour: -3, canal: 'sms', titre: 'Rappel urgent', message: 'Échéance imminente : {montant} TND dans 3 jours.', estObligatoire: true },
      { id: 'e7', jour: 1, canal: 'email', titre: 'Relance immédiate', message: 'Votre paiement est en retard. Veuillez régulariser.', estObligatoire: true },
      { id: 'e8', jour: 1, canal: 'sms', titre: 'SMS relance J+1', message: 'Retard de paiement constaté. Merci de nous contacter.', estObligatoire: true },
      { id: 'e9', jour: 3, canal: 'appel', titre: 'Appel immédiat', message: 'Appel de relance urgent.', estObligatoire: true },
      { id: 'e10', jour: 5, canal: 'whatsapp', titre: 'WhatsApp relance', message: 'Nous n\'avons pas reçu votre paiement. Contactez-nous.', estObligatoire: true },
      { id: 'e11', jour: 10, canal: 'email', titre: 'Mise en demeure express', message: 'Dernière relance avant transfert en contentieux.', estObligatoire: true },
      { id: 'e12', jour: 15, canal: 'email', titre: 'Transfert contentieux', message: 'Votre dossier est transféré au service contentieux.', estObligatoire: true },
    ],
  },
  {
    id: 'sc-3',
    nom: 'Relance Amiable',
    description: 'Scénario doux pour les clients fiables avec rappels espacés.',
    cibleClassification: ['fiable'],
    arretSiPaiement: true,
    actif: false,
    etapes: [
      { id: 'e13', jour: -7, canal: 'email', titre: 'Rappel courtois', message: 'Un rappel amical : votre échéance approche.', estObligatoire: true },
      { id: 'e14', jour: 3, canal: 'sms', titre: 'Rappel SMS', message: 'Petit rappel pour votre échéance passée.', estObligatoire: true },
      { id: 'e15', jour: 15, canal: 'email', titre: 'Suivi amiable', message: 'Nous souhaitons faire le point sur votre situation.', estObligatoire: false },
      { id: 'e16', jour: 30, canal: 'appel', titre: 'Contact téléphonique', message: 'Discussion sur les modalités de paiement.', estObligatoire: false },
    ],
  },
];

// Mock executions for existing dossiers
export const mockRelanceExecutions: RelanceExecution[] = [
  { id: 'rx-1', dossierId: '1', scenarioId: 'sc-1', etapeId: 'e1', canal: 'sms', statut: 'envoyee', dateEnvoi: '2024-03-10' },
  { id: 'rx-2', dossierId: '1', scenarioId: 'sc-1', etapeId: 'e2', canal: 'email', statut: 'envoyee', dateEnvoi: '2024-03-16' },
  { id: 'rx-3', dossierId: '1', scenarioId: 'sc-1', etapeId: 'e3', canal: 'sms', statut: 'envoyee', dateEnvoi: '2024-03-22', dateReponse: '2024-03-23', commentaire: 'Client a demandé un délai' },
  { id: 'rx-4', dossierId: '1', scenarioId: 'sc-1', etapeId: 'e4', canal: 'appel', statut: 'planifiee', dateEnvoi: '2024-03-30' },
  { id: 'rx-5', dossierId: '3', scenarioId: 'sc-1', etapeId: 'e1', canal: 'sms', statut: 'envoyee', dateEnvoi: '2024-03-08' },
  { id: 'rx-6', dossierId: '3', scenarioId: 'sc-1', etapeId: 'e2', canal: 'email', statut: 'echouee', dateEnvoi: '2024-03-14', commentaire: 'Adresse email invalide' },
  { id: 'rx-7', dossierId: '6', scenarioId: 'sc-2', etapeId: 'e6', canal: 'sms', statut: 'envoyee', dateEnvoi: '2024-03-07' },
  { id: 'rx-8', dossierId: '6', scenarioId: 'sc-2', etapeId: 'e7', canal: 'email', statut: 'envoyee', dateEnvoi: '2024-03-11' },
  { id: 'rx-9', dossierId: '6', scenarioId: 'sc-2', etapeId: 'e9', canal: 'appel', statut: 'repondue', dateEnvoi: '2024-03-13', dateReponse: '2024-03-13', commentaire: 'Promesse de paiement obtenue' },
  { id: 'rx-10', dossierId: '7', scenarioId: 'sc-2', etapeId: 'e6', canal: 'sms', statut: 'envoyee', dateEnvoi: '2024-02-20' },
  { id: 'rx-11', dossierId: '7', scenarioId: 'sc-2', etapeId: 'e7', canal: 'email', statut: 'envoyee', dateEnvoi: '2024-02-24' },
  { id: 'rx-12', dossierId: '7', scenarioId: 'sc-2', etapeId: 'e9', canal: 'appel', statut: 'echouee', dateEnvoi: '2024-02-26', commentaire: 'Injoignable' },
  { id: 'rx-13', dossierId: '7', scenarioId: 'sc-2', etapeId: 'e10', canal: 'whatsapp', statut: 'envoyee', dateEnvoi: '2024-02-28' },
  { id: 'rx-14', dossierId: '7', scenarioId: 'sc-2', etapeId: 'e11', canal: 'email', statut: 'envoyee', dateEnvoi: '2024-03-05' },
  { id: 'rx-15', dossierId: '7', scenarioId: 'sc-2', etapeId: 'e12', canal: 'email', statut: 'envoyee', dateEnvoi: '2024-03-10', commentaire: 'Transfert effectué' },
  { id: 'rx-16', dossierId: '5', scenarioId: 'sc-1', etapeId: 'e1', canal: 'sms', statut: 'envoyee', dateEnvoi: '2024-03-06' },
  { id: 'rx-17', dossierId: '5', scenarioId: 'sc-1', etapeId: 'e2', canal: 'email', statut: 'repondue', dateEnvoi: '2024-03-12', dateReponse: '2024-03-12', commentaire: 'Promesse de paiement le 20/03' },
];
