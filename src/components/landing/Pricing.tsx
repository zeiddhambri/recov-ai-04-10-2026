import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const plans = [
  {
    name: 'STARTER',
    price: '2 490 TND',
    sub: '/mois · cible IMF & Leasing',
    features: [
      '300 dossiers actifs',
      'Tableaux de bord standard',
      'Recouvrement complet (6 modules)',
      'Contentieux complet (6 modules)',
      'Moteur relance inclus',
      '2 types de portefeuilles',
      '+8 TND/dossier variable',
    ],
    featured: false,
  },
  {
    name: 'PROFESSIONNEL ★',
    price: '4 990 TND',
    sub: '/mois · banques secondaires',
    features: [
      'Dossiers illimités',
      'Rapports pré-formatés type BCT (assistance)',
      '4 types de portefeuilles',
      "Workflows d'escalade paramétrables",
      'Moteur de scoring transparent (5 piliers)',
      'Portail Avocats/Huissiers — roadmap',
      'API REST JSON authentifiée',
      '+8 TND/dossier variable',
    ],
    featured: true,
  },
  {
    name: 'ENTERPRISE',
    price: '8 000+ TND',
    sub: '/mois · grandes banques',
    features: [
      'Portefeuilles illimités',
      'IA prédictive V2 (ML/NLP) — roadmap',
      'Multi-entités / Multi-pays',
      'SLA contractuel + Account Manager (à la signature)',
      'Performance fee : 0,8 % delta',
      'Connecteurs BCT/SIBTEL (sur devis)',
      'Tarif négociable',
    ],
    featured: false,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-24 lg:py-32 bg-paper-soft">
      <div className="container-atr">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="eyebrow mb-5 block">Tarification</span>
          <h2 className="h-display mb-6">
            Une plateforme, trois formats, adaptés à votre portefeuille
          </h2>
          <p className="text-slate text-[17px] font-light">
            Choisissez la formule qui correspond à la taille de votre portefeuille
            de créances et au niveau de fonctionnalités de recouvrement recherché.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8 items-stretch pt-4">
          {plans.map((plan, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -6, transition: { duration: 0.25, ease: 'easeOut' } }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              viewport={{ once: true }}
              className={cn(
                'relative p-10 rounded-sm flex flex-col transition-shadow duration-300 ease-out cursor-pointer',
                plan.featured
                  ? 'bg-white border-2 border-crimson shadow-lg hover:shadow-2xl scale-102 lg:scale-105'
                  : 'bg-white border border-border shadow-sm hover:shadow-xl hover:border-slate-300'
              )}
            >
              {plan.featured && (
                <div className="absolute -top-3.5 left-1/2 transform -translate-x-1/2 bg-crimson text-white text-[11px] font-bold px-4 py-1 rounded-full shadow-md">
                  ★
                </div>
              )}

              <div className={cn(
                "text-[11px] font-semibold uppercase tracking-[0.2em] mb-5",
                plan.featured ? "text-crimson" : "text-slate"
              )}>
                {plan.name}
              </div>

              <div className="flex flex-col mb-6">
                <span className="font-serif-display text-4xl lg:text-5xl font-bold text-charcoal">
                  {plan.price}
                </span>
                <span className="text-sm font-light text-slate mt-2 italic">
                  {plan.sub}
                </span>
              </div>

              <div className={cn('h-px w-full mb-8', plan.featured ? 'bg-crimson/20' : 'bg-border')} />

              <ul className="space-y-3.5 mb-10 flex-1">
                {plan.features.map((feat, j) => (
                  <li key={j} className="flex items-start gap-3 text-[14px] font-light leading-relaxed">
                    <span className="text-crimson font-bold shrink-0 mt-0.5">✓</span>
                    <span className="text-charcoal">{feat}</span>
                  </li>
                ))}
              </ul>

              <button className={plan.featured ? 'btn-crimson w-full font-medium' : 'btn-outline-crimson w-full font-medium'}>
                {plan.name === 'ENTERPRISE' ? 'Nous contacter' : 'Demander une démo'}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
