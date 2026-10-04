import { Router } from 'express';
import { requireRole, audit } from '../auth';
import { validate, createInstitutionSchema } from '../validation';

export interface ServerInstitution {
  id: string;
  code: string;
  name: string;
  fullName: string;
  category: 'banque_residente' | 'banque_offshore' | 'microfinance' | 'leasing_factoring';
  legalForm: string;
  regulatoryBody: string;
  headquarters: string;
  status: 'active' | 'in_restructuring';
  swiftCode?: string;
  branchesCount: number;
  contactEmail?: string;
  website?: string;
  specialty?: string;
}

const TUNISIAN_INSTITUTIONS_STORE: ServerInstitution[] = [
  // 1. BANQUES RÉSIDENTES (19 banques)
  {
    id: 'stb',
    code: 'STB',
    name: 'STB',
    fullName: 'Société Tunisienne de Banque',
    category: 'banque_residente',
    legalForm: 'Société Anonyme',
    regulatoryBody: 'Banque Centrale de Tunisie (BCT)',
    headquarters: 'Rue Hédi Nouira, Tunis',
    status: 'active',
    swiftCode: 'STBKTNTT',
    branchesCount: 145,
    contactEmail: 'contact@stb.com.tn',
    website: 'https://www.stb.com.tn',
    specialty: 'Banque Publique / Universelle & Entreprises'
  },
  {
    id: 'bna',
    code: 'BNA',
    name: 'BNA',
    fullName: 'Banque Nationale Agricole',
    category: 'banque_residente',
    legalForm: 'Société Anonyme',
    regulatoryBody: 'Banque Centrale de Tunisie (BCT)',
    headquarters: 'Rue de la Monnaie, Tunis',
    status: 'active',
    swiftCode: 'BNATTNTT',
    branchesCount: 160,
    contactEmail: 'contact@bna.tn',
    website: 'https://www.bna.tn',
    specialty: 'Banque Publique / Agriculture, Agroalimentaire & Universelle'
  },
  {
    id: 'bh',
    code: 'BH Bank',
    name: 'BH Bank',
    fullName: "Banque de l'Habitat",
    category: 'banque_residente',
    legalForm: 'Société Anonyme',
    regulatoryBody: 'Banque Centrale de Tunisie (BCT)',
    headquarters: 'Avenue Kheireddine Pacha, Tunis',
    status: 'active',
    swiftCode: 'BHBKTNTT',
    branchesCount: 130,
    contactEmail: 'contact@bhbank.tn',
    website: 'https://www.bhbank.tn',
    specialty: 'Banque Publique / Financement Immobilier, Promoteurs & Retail'
  },
  {
    id: 'bte',
    code: 'BTE',
    name: 'BTE',
    fullName: 'Banque de Tunisie et des Émirats',
    category: 'banque_residente',
    legalForm: 'Société Anonyme',
    regulatoryBody: 'Banque Centrale de Tunisie (BCT)',
    headquarters: 'Boulevard Mohamed V, Tunis',
    status: 'active',
    swiftCode: 'BTETNTT',
    branchesCount: 30,
    contactEmail: 'contact@bte.com.tn',
    website: 'https://www.bte.com.tn',
    specialty: 'Banque Mixte / Investissement & Retail'
  },
  {
    id: 'bts',
    code: 'BTS',
    name: 'BTS',
    fullName: 'Banque Tunisienne de Solidarité',
    category: 'banque_residente',
    legalForm: 'Société Anonyme',
    regulatoryBody: 'Banque Centrale de Tunisie (BCT)',
    headquarters: 'Avenue Mohamed V, Tunis',
    status: 'active',
    swiftCode: 'BTSTTNTT',
    branchesCount: 26,
    contactEmail: 'contact@bts.com.tn',
    website: 'https://www.bts.com.tn',
    specialty: 'Banque Publique / Financement de projets & Microcrédits institutionnels'
  },
  {
    id: 'bfpme',
    code: 'BFPME',
    name: 'BFPME',
    fullName: 'Banque de Financement des PME',
    category: 'banque_residente',
    legalForm: 'Société Anonyme',
    regulatoryBody: 'Banque Centrale de Tunisie (BCT)',
    headquarters: 'Immeuble BFPME, Centre Urbain Nord, Tunis',
    status: 'active',
    swiftCode: 'BFPMTNTT',
    branchesCount: 24,
    contactEmail: 'contact@bfpme.com.tn',
    website: 'https://www.bfpme.com.tn',
    specialty: 'Banque Publique / Financement & Accompagnement des PME innovantes'
  },
  {
    id: 'biat',
    code: 'BIAT',
    name: 'BIAT',
    fullName: 'Banque Internationale Arabe de Tunisie',
    category: 'banque_residente',
    legalForm: 'Société Anonyme',
    regulatoryBody: 'Banque Centrale de Tunisie (BCT)',
    headquarters: 'Boulevard Habib Bourguiba, Tunis',
    status: 'active',
    swiftCode: 'BIATTNTT',
    branchesCount: 205,
    contactEmail: 'contact@biat.com.tn',
    website: 'https://www.biat.com.tn',
    specialty: '1ère Banque Privée / Corporate, PME, Retail & Banque d\'affaires'
  },
  {
    id: 'attijari',
    code: 'Attijari Bank',
    name: 'Attijari Bank',
    fullName: 'Attijari Bank Tunisie',
    category: 'banque_residente',
    legalForm: 'Société Anonyme',
    regulatoryBody: 'Banque Centrale de Tunisie (BCT)',
    headquarters: 'Rue de la Bourse, Les Berges du Lac, Tunis',
    status: 'active',
    swiftCode: 'BSTNTNTT',
    branchesCount: 140,
    contactEmail: 'contact@attijaribank.com.tn',
    website: 'https://www.attijaribank.com.tn',
    specialty: 'Banque Universelle / Commerce Extérieur, Corporate & Particuliers'
  },
  {
    id: 'amen',
    code: 'Amen Bank',
    name: 'Amen Bank',
    fullName: 'Amen Bank',
    category: 'banque_residente',
    legalForm: 'Société Anonyme',
    regulatoryBody: 'Banque Centrale de Tunisie (BCT)',
    headquarters: 'Avenue Mohamed V, Tunis',
    status: 'active',
    swiftCode: 'CFCTTNTT',
    branchesCount: 160,
    contactEmail: 'amenbank@amenbank.com.tn',
    website: 'https://www.amenbank.com.tn',
    specialty: 'Banque Privée / Entreprises, PME, Leasing & Digital Banking'
  },
  {
    id: 'uib',
    code: 'UIB',
    name: 'UIB',
    fullName: 'Union Internationale de Banques',
    category: 'banque_residente',
    legalForm: 'Société Anonyme',
    regulatoryBody: 'Banque Centrale de Tunisie (BCT)',
    headquarters: 'Boulevard du 20 Mars 1956, Bab Souika, Tunis',
    status: 'active',
    swiftCode: 'UIBKTNTT',
    branchesCount: 145,
    contactEmail: 'contact@uib.com.tn',
    website: 'https://www.uib.com.tn',
    specialty: 'Banque Universelle / Corporate, Retail & Trade Finance'
  },
  {
    id: 'bt',
    code: 'BT',
    name: 'BT',
    fullName: 'Banque de Tunisie',
    category: 'banque_residente',
    legalForm: 'Société Anonyme',
    regulatoryBody: 'Banque Centrale de Tunisie (BCT)',
    headquarters: 'Rue de Rome, Tunis',
    status: 'active',
    swiftCode: 'BTUNTNTT',
    branchesCount: 125,
    contactEmail: 'contact@bt.com.tn',
    website: 'https://www.bt.com.tn',
    specialty: 'Banque Historique Privée / Industrie, Commerce & Gestion de patrimoine'
  },
  {
    id: 'ubci',
    code: 'UBCI',
    name: 'UBCI',
    fullName: 'Union Bancaire pour le Commerce et l\'Industrie',
    category: 'banque_residente',
    legalForm: 'Société Anonyme',
    regulatoryBody: 'Banque Centrale de Tunisie (BCT)',
    headquarters: 'Avenue Habib Bourguiba, Tunis',
    status: 'active',
    swiftCode: 'UBCITNTT',
    branchesCount: 105,
    contactEmail: 'contact@ubci.tn',
    website: 'https://www.ubci.tn',
    specialty: 'Banque Universelle / Grandes entreprises, PME & Professionnels'
  },
  {
    id: 'atb',
    code: 'ATB',
    name: 'ATB',
    fullName: 'Arab Tunisian Bank',
    category: 'banque_residente',
    legalForm: 'Société Anonyme',
    regulatoryBody: 'Banque Centrale de Tunisie (BCT)',
    headquarters: 'Rue Hédi Nouira, Tunis',
    status: 'active',
    swiftCode: 'ATBKTNTT',
    branchesCount: 130,
    contactEmail: 'contact@atb.com.tn',
    website: 'https://www.atb.com.tn',
    specialty: 'Banque Commerciale & Internationale / Réseau Arab Bank Group'
  },
  {
    id: 'btk',
    code: 'BTK',
    name: 'BTK',
    fullName: 'Banque Tuniso-Koweïtienne',
    category: 'banque_residente',
    legalForm: 'Société Anonyme',
    regulatoryBody: 'Banque Centrale de Tunisie (BCT)',
    headquarters: 'Avenue Mohamed V, Tunis',
    status: 'active',
    swiftCode: 'BTKOTNTT',
    branchesCount: 35,
    contactEmail: 'contact@btknet.com',
    website: 'https://www.btknet.com',
    specialty: 'Banque Mixte / Financement de l\'investissement & Corporate'
  },
  {
    id: 'btl',
    code: 'BTL',
    name: 'BTL',
    fullName: 'Banque Tuniso-Libyenne',
    category: 'banque_residente',
    legalForm: 'Société Anonyme',
    regulatoryBody: 'Banque Centrale de Tunisie (BCT)',
    headquarters: 'Avenue Mohamed V, Tunis',
    status: 'active',
    swiftCode: 'BTLBTNTT',
    branchesCount: 18,
    contactEmail: 'contact@btl.com.tn',
    website: 'https://www.btl.com.tn',
    specialty: 'Banque Mixte / Échanges bilatéraux Tunisie-Libye & Trade Finance'
  },
  {
    id: 'tsb',
    code: 'TSB',
    name: 'TSB',
    fullName: 'Tunisian Saudi Bank (ex-STUSID)',
    category: 'banque_residente',
    legalForm: 'Société Anonyme',
    regulatoryBody: 'Banque Centrale de Tunisie (BCT)',
    headquarters: 'Avenue Mohamed V, Tunis',
    status: 'active',
    swiftCode: 'STUSTNTT',
    branchesCount: 22,
    contactEmail: 'contact@tsb.com.tn',
    website: 'https://www.tsb.com.tn',
    specialty: 'Banque Mixte / Investissement, Industrie, Tourisme & Services'
  },
  {
    id: 'zitouna',
    code: 'Banque Zitouna',
    name: 'Banque Zitouna',
    fullName: 'Banque Zitouna',
    category: 'banque_residente',
    legalForm: 'Société Anonyme',
    regulatoryBody: 'Banque Centrale de Tunisie (BCT)',
    headquarters: '2 Boulevard Qualité de la Vie, Le Kram, Tunis',
    status: 'active',
    swiftCode: 'BZIUTNTT',
    branchesCount: 185,
    contactEmail: 'contact@banquezitouna.com',
    website: 'https://www.banquezitouna.com',
    specialty: '1ère Banque Islamique / Murabaha, Ijara, Istisnaa & Takaful'
  },
  {
    id: 'albaraka',
    code: 'Al Baraka Bank',
    name: 'Al Baraka Bank',
    fullName: 'Al Baraka Bank Tunisia',
    category: 'banque_residente',
    legalForm: 'Société Anonyme',
    regulatoryBody: 'Banque Centrale de Tunisie (BCT)',
    headquarters: '88 Avenue Hédi Chaker, Tunis',
    status: 'active',
    swiftCode: 'BARTTNTT',
    branchesCount: 40,
    contactEmail: 'contact@albarakabank.com.tn',
    website: 'https://www.albaraka.com.tn',
    specialty: 'Banque Participative / Finance Islamique & Commerce International'
  },
  {
    id: 'wifak',
    code: 'WIFAK Bank',
    name: 'WIFAK Bank',
    fullName: 'WIFAK International Bank',
    category: 'banque_residente',
    legalForm: 'Société Anonyme',
    regulatoryBody: 'Banque Centrale de Tunisie (BCT)',
    headquarters: 'Avenue Habib Bourguiba, Médenine / Rue du Lac Malaren, Tunis',
    status: 'active',
    swiftCode: 'WIFKTNTT',
    branchesCount: 45,
    contactEmail: 'contact@wifakbank.com',
    website: 'https://www.wifakbank.com',
    specialty: 'Banque Islamique Universelle (ex-El Wifack Leasing)'
  },

  // 2. BANQUES NON-RÉSIDENTES / OFFSHORE (5 banques)
  {
    id: 'naib',
    code: 'NAIB',
    name: 'NAIB',
    fullName: 'North Africa International Bank',
    category: 'banque_offshore',
    legalForm: 'Société Anonyme',
    regulatoryBody: 'Banque Centrale de Tunisie (BCT)',
    headquarters: 'Avenue Kheireddine Pacha, Tunis',
    status: 'active',
    swiftCode: 'NAIBTNTT',
    branchesCount: 3,
    contactEmail: 'contact@naibbank.com',
    website: 'https://www.naibbank.com',
    specialty: 'Banque Offshore / Financement du Commerce Maghrébin & International'
  },
  {
    id: 'tib',
    code: 'TIB',
    name: 'TIB',
    fullName: 'Tunis International Bank',
    category: 'banque_offshore',
    legalForm: 'Société Anonyme',
    regulatoryBody: 'Banque Centrale de Tunisie (BCT)',
    headquarters: 'Centre Urbain Nord, Tunis',
    status: 'active',
    swiftCode: 'TIBKTNTT',
    branchesCount: 2,
    contactEmail: 'tib@tib.com.tn',
    website: 'https://www.tib.com.tn',
    specialty: 'Banque Offshore / Private Banking, Financement en devises (Burgan Group)'
  },
  {
    id: 'alubaf',
    code: 'Alubaf',
    name: 'Alubaf',
    fullName: 'Alubaf International Bank Tunis',
    category: 'banque_offshore',
    legalForm: 'Société Anonyme',
    regulatoryBody: 'Banque Centrale de Tunisie (BCT)',
    headquarters: 'Rue Hédi Karray, Centre Urbain Nord, Tunis',
    status: 'active',
    swiftCode: 'ALUBTNTT',
    branchesCount: 2,
    contactEmail: 'info@alubaf.com.tn',
    website: 'https://www.alubaf.com.tn',
    specialty: 'Banque Offshore / Trade Finance & Syndications Internationales'
  },
  {
    id: 'abc_offshore',
    code: 'ABC Offshore',
    name: 'ABC Offshore',
    fullName: 'Arab Banking Corporation (Offshore)',
    category: 'banque_offshore',
    legalForm: 'Société Anonyme',
    regulatoryBody: 'Banque Centrale de Tunisie (BCT)',
    headquarters: 'Immeuble ABC, Les Berges du Lac, Tunis',
    status: 'active',
    swiftCode: 'ABCOTNTT',
    branchesCount: 2,
    contactEmail: 'contact@bank-abc.com',
    website: 'https://www.bank-abc.com',
    specialty: 'Banque Offshore / Financement de Projets Industriels & Énergie'
  },
  {
    id: 'citibank_offshore',
    code: 'Citibank Offshore',
    name: 'Citibank Offshore',
    fullName: 'Citibank N.A. Tunisia (Branch Offshore)',
    category: 'banque_offshore',
    legalForm: 'Succursale de Banque Étrangère',
    regulatoryBody: 'Banque Centrale de Tunisie (BCT)',
    headquarters: '3 Rue Kheireddine Pacha, Tunis',
    status: 'active',
    swiftCode: 'CITITNTT',
    branchesCount: 1,
    contactEmail: 'citi.tunisia@citi.com',
    website: 'https://www.citigroup.com',
    specialty: 'Banque Offshore / Multinationales, FX, Trésorerie & Cash Management'
  },

  // 3. INSTITUTIONS DE MICROFINANCE (IMF) - Agréées par l'ACM (9 IMF)
  {
    id: 'enda_tamweel',
    code: 'Enda Tamweel',
    name: 'Enda Tamweel',
    fullName: 'Enda Tamweel S.A.',
    category: 'microfinance',
    legalForm: 'Société Anonyme',
    regulatoryBody: 'Autorité de Contrôle de la Microfinance (ACM)',
    headquarters: 'Rue Remada, Cité El Khadra, Tunis',
    status: 'active',
    branchesCount: 105,
    contactEmail: 'contact@endatamweel.tn',
    website: 'https://www.endatamweel.tn',
    specialty: '1ère Institution de Microfinance en Tunisie / Micro-entrepreneurs, Femmes & Jeunes'
  },
  {
    id: 'baobab_tunisie',
    code: 'Baobab Tunisie',
    name: 'Baobab Tunisie',
    fullName: 'Baobab Tunisie S.A. (ex-Microcred)',
    category: 'microfinance',
    legalForm: 'Société Anonyme (ex-Microcred)',
    regulatoryBody: 'Autorité de Contrôle de la Microfinance (ACM)',
    headquarters: 'Les Berges du Lac II, Tunis',
    status: 'active',
    branchesCount: 25,
    contactEmail: 'contact.tunisie@baobabgroup.com',
    website: 'https://baobabgroup.com/tn',
    specialty: 'Microfinance Digitale & Financement des TPE / Très Petites Entreprises'
  },
  {
    id: 'advans_tunisie',
    code: 'Advans Tunisie',
    name: 'Advans Tunisie',
    fullName: 'Advans Tunisie S.A.',
    category: 'microfinance',
    legalForm: 'Société Anonyme',
    regulatoryBody: 'Autorité de Contrôle de la Microfinance (ACM)',
    headquarters: 'Centre Urbain Nord, Tunis',
    status: 'active',
    branchesCount: 19,
    contactEmail: 'contact@advanstunisie.com',
    website: 'https://www.advanstunisie.com',
    specialty: 'Microfinance & Petits exploitants agricoles, Artisans & Commerçants'
  },
  {
    id: 'taysir_microfinance',
    code: 'Taysir Microfinance',
    name: 'Taysir Microfinance',
    fullName: 'Taysir Microfinance S.A.',
    category: 'microfinance',
    legalForm: 'Société Anonyme',
    regulatoryBody: 'Autorité de Contrôle de la Microfinance (ACM)',
    headquarters: 'Montplaisir, Tunis',
    status: 'active',
    branchesCount: 14,
    contactEmail: 'contact@taysir-microfinance.tn',
    website: 'https://www.taysir-microfinance.tn',
    specialty: 'Microcrédits mobiles, Zones rurales & Insertion économique'
  },
  {
    id: 'zitouna_tamkeen',
    code: 'Zitouna Tamkeen',
    name: 'Zitouna Tamkeen',
    fullName: 'Zitouna Tamkeen S.A.',
    category: 'microfinance',
    legalForm: 'Société Anonyme',
    regulatoryBody: 'Autorité de Contrôle de la Microfinance (ACM)',
    headquarters: 'Les Berges du Lac I, Tunis',
    status: 'active',
    branchesCount: 18,
    contactEmail: 'contact@zitounatamkeen.com',
    website: 'https://www.zitounatamkeen.com',
    specialty: '1ère Institution de Microfinance Islamique en Tunisie / Ingénierie de projets'
  },
  {
    id: 'cfe_tunisie',
    code: 'CFE Tunisie',
    name: 'CFE Tunisie',
    fullName: 'Centre Financier aux Entrepreneurs (CFE Tunisie S.A.)',
    category: 'microfinance',
    legalForm: 'Société Anonyme',
    regulatoryBody: 'Autorité de Contrôle de la Microfinance (ACM)',
    headquarters: 'Avenue Habib Bourguiba, Tunis',
    status: 'active',
    branchesCount: 10,
    contactEmail: 'contact@cfe.com.tn',
    website: 'https://www.cfe.com.tn',
    specialty: 'Financement des Micros et Petites Entreprises (MPE) en développement'
  },
  {
    id: 'daam_tunisie',
    code: 'DAAM Tunisie',
    name: 'DAAM Tunisie',
    fullName: 'DAAM Microfinance Tunisie S.A.',
    category: 'microfinance',
    legalForm: 'Société Anonyme',
    regulatoryBody: 'Autorité de Contrôle de la Microfinance (ACM)',
    headquarters: 'Menzah IV, Tunis',
    status: 'active',
    branchesCount: 8,
    contactEmail: 'contact@daam.tn',
    website: 'https://www.daam.tn',
    specialty: 'Microfinance solidaire & Financement de proximité'
  },
  {
    id: 'asad_tamweel',
    code: 'ASAD Tamweel',
    name: 'ASAD Tamweel',
    fullName: 'ASAD Tamweel S.A.',
    category: 'microfinance',
    legalForm: 'Société Anonyme',
    regulatoryBody: 'Autorité de Contrôle de la Microfinance (ACM)',
    headquarters: 'Avenue de la Liberté, Tunis',
    status: 'active',
    branchesCount: 6,
    contactEmail: 'contact@asadtamweel.tn',
    website: 'https://www.asadtamweel.tn',
    specialty: 'Micro-entreprises & Projets communautaires'
  },
  {
    id: 'al_amal_microfinance',
    code: 'Al Amal Microfinance',
    name: 'Al Amal Microfinance',
    fullName: 'Al Amal Microfinance S.A.',
    category: 'microfinance',
    legalForm: 'Société Anonyme',
    regulatoryBody: 'Autorité de Contrôle de la Microfinance (ACM)',
    headquarters: 'Sfax / Tunis',
    status: 'active',
    branchesCount: 5,
    contactEmail: 'contact@alamal-microfinance.tn',
    website: 'https://www.alamal-microfinance.tn',
    specialty: 'Microcrédits productifs & Inclusion financière régionale'
  },

  // 4. LEASING & FACTORING
  {
    id: 'tunisie_leasing',
    code: 'Tunisie Leasing',
    name: 'Tunisie Leasing & Factoring',
    fullName: 'Tunisie Leasing & Factoring (TLF)',
    category: 'leasing_factoring',
    legalForm: 'Société Anonyme',
    regulatoryBody: 'Banque Centrale de Tunisie (BCT)',
    headquarters: 'Centre Urbain Nord, Tunis',
    status: 'active',
    swiftCode: 'TLFNTNTT',
    branchesCount: 16,
    contactEmail: 'contact@tlf.com.tn',
    website: 'https://www.tlf.com.tn',
    specialty: 'Pionnier du Crédit-Bail et Affacturage en Tunisie'
  },
  {
    id: 'attijari_leasing',
    code: 'Attijari Leasing',
    name: 'Attijari Leasing',
    fullName: 'Attijari Leasing S.A.',
    category: 'leasing_factoring',
    legalForm: 'Société Anonyme',
    regulatoryBody: 'Banque Centrale de Tunisie (BCT)',
    headquarters: 'Les Berges du Lac, Tunis',
    status: 'active',
    branchesCount: 12,
    contactEmail: 'contact@attijarileasing.com.tn',
    website: 'https://www.attijarileasing.com.tn',
    specialty: 'Crédit-bail mobilier et immobilier pour professionnels et PME'
  }
];

const router = Router();

// GET /api/institutions - list all with optional filters
router.get('/', (req, res) => {
  const { category, search } = req.query;
  let result = [...TUNISIAN_INSTITUTIONS_STORE];

  if (category && category !== 'all' && category !== 'All') {
    result = result.filter(i => i.category === category);
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase().trim();
    result = result.filter(i => 
      i.code.toLowerCase().includes(q) ||
      i.name.toLowerCase().includes(q) ||
      i.fullName.toLowerCase().includes(q) ||
      i.headquarters.toLowerCase().includes(q) ||
      (i.specialty && i.specialty.toLowerCase().includes(q))
    );
  }

  res.json(result);
});

// GET /api/institutions/stats - summary counts
router.get('/stats', (req, res) => {
  const total = TUNISIAN_INSTITUTIONS_STORE.length;
  const residentBanks = TUNISIAN_INSTITUTIONS_STORE.filter(i => i.category === 'banque_residente').length;
  const offshoreBanks = TUNISIAN_INSTITUTIONS_STORE.filter(i => i.category === 'banque_offshore').length;
  const imf = TUNISIAN_INSTITUTIONS_STORE.filter(i => i.category === 'microfinance').length;
  const leasing = TUNISIAN_INSTITUTIONS_STORE.filter(i => i.category === 'leasing_factoring').length;
  const totalBranches = TUNISIAN_INSTITUTIONS_STORE.reduce((acc, i) => acc + (i.branchesCount || 0), 0);

  res.json({
    total,
    residentBanks,
    offshoreBanks,
    imf,
    leasing,
    totalBranches
  });
});

// GET /api/institutions/:id - single institution
router.get('/:id', (req, res) => {
  const inst = TUNISIAN_INSTITUTIONS_STORE.find(i => 
    i.id === req.params.id || 
    i.code.toLowerCase() === req.params.id.toLowerCase()
  );
  if (!inst) {
    return res.status(404).json({ error: 'Institution introuvable' });
  }
  res.json(inst);
});

// POST /api/institutions - add custom branch or institution (admin, journalisé)
router.post('/', requireRole('admin'), validate(createInstitutionSchema), (req, res) => {
  const { code, name, fullName, category, legalForm, regulatoryBody, headquarters, branchesCount, specialty } = req.body;

  const newInst: ServerInstitution = {
    id: `inst-${Date.now()}`,
    code,
    name,
    fullName: fullName || name,
    category: category || 'banque_residente',
    legalForm: legalForm || 'Société Anonyme',
    regulatoryBody: regulatoryBody || 'Banque Centrale de Tunisie (BCT)',
    headquarters: headquarters || 'Tunis',
    status: 'active',
    branchesCount: Number(branchesCount) || 1,
    specialty
  };

  TUNISIAN_INSTITUTIONS_STORE.push(newInst);
  res.status(201).json(newInst);
});

export default router;
