import { motion } from 'framer-motion';
import { Calculator, Scale, Bot, TrendingUp, Workflow, Sprout, ArrowRight } from 'lucide-react';

const features = [
  {
    icon: Calculator,
    title: 'Octroi de Crédit & IFRS 9',
    desc: "Masse de décision pré-octroi avec simulateur de provisionnement prospectif IFRS 9, classification automatique (Bucketing Stage 1/2/3) et test de dégradation prospective avec facteurs macroéconomiques, alignées sur les référentiels BCT et IFRS 9 (outil d'aide à la décision, sans certification).",
  },
  {
    icon: TrendingUp,
    title: 'Leasing & Crédit-Bail',
    desc: "Gestion de bout en bout des contrats de crédit-bail : calculs des loyers impayés intégrés, indemnités financières de résiliation, valeur résiduelle et gestion des garanties matérielles.",
  },
  {
    icon: Workflow,
    title: 'Factoring & Affacturage',
    desc: "Suivi de la relation tripartite (cédants, acheteurs, factor). Tableau de bord de cession des créances, conciliation, et accompagnement spécifique pour les créances institutionnelles (ex: STEG).",
  },
  {
    icon: Sprout,
    title: 'Recouvrement Microfinance',
    desc: "Workflow de terrain adapté aux IMF : suivi des cautionnements solidaires, évaluation des Activités Génératrices de Revenus (AGR), relance de proximité et accompagnement éco-social.",
  },
  {
    icon: Scale,
    title: 'Contentieux Judiciaire & Frais',
    desc: "Tableau de bord de suivi légal avec archivage horodaté des documents juridiques avec contrôle de conformité interne, comptabilisation rigoureuse des frais de justice engagés, et pilotage des avocats partenaires.",
  },
  {
    icon: Bot,
    title: 'Moteur Cognitive & Relances IA',
    desc: "Scénarios stratégiques autogénérés par l'IA (SMS, WhatsApp, emails personnalisés), priorisés par un scoring prédictif dynamique de recouvrement de 0 à 100.",
  },
];

export default function Features() {
  return (
    <section id="features" className="py-24 lg:py-32 bg-white">
      <div className="container-atr">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 mb-20">
          <div className="lg:col-span-5">
            <span className="eyebrow mb-5 block">Modules de la plateforme</span>
            <h2 className="h-display">
              Six modules pensés pour le recouvrement bancaire en Tunisie
            </h2>
          </div>
          <div className="lg:col-span-6 lg:col-start-7 lg:pt-4">
            <p className="text-slate text-[17px] leading-[1.7] font-light mb-6">
              RecovAI couvre le cycle complet de la créance classifiée — de la
              première relance à la clôture du contentieux. Chaque module est
              opérationnel et conçu pour s'intégrer au workflow réel de vos
              équipes recouvrement.
            </p>
            <a href="#pricing" className="inline-flex items-center gap-2 text-crimson text-[13px] font-semibold uppercase tracking-wider">
              Voir les offres <ArrowRight size={14} />
            </a>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border rounded-sm overflow-hidden">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                viewport={{ once: true }}
                className="group bg-white p-10 hover:bg-paper-soft transition-colors duration-300 cursor-pointer"
              >
                <Icon className="text-crimson mb-6" size={32} strokeWidth={1.4} />
                <h3 className="font-serif-display text-[22px] text-charcoal mb-3 group-hover:text-crimson transition-colors">
                  {f.title}
                </h3>
                <p className="text-slate text-[15px] leading-relaxed font-light">
                  {f.desc}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
