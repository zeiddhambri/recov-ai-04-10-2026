import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import cardAmiable from '@/assets/card-amiable.jpg';
import cardContact from '@/assets/card-contact.jpg';
import cardContentieux from '@/assets/card-contentieux.jpg';

const cards = [
  {
    img: cardAmiable,
    title: 'Phase amiable automatisée',
    desc: "Orchestrez vos relances SMS, email, WhatsApp et appels selon des scénarios paramétrables (Standard, Intensif, Amiable) déclenchés par les délais et le score client.",
    href: '#features',
    cta: 'Voir le moteur de relance',
  },
  {
    img: cardContentieux,
    title: 'Suivi contentieux intégré',
    desc: "Pilotez les dossiers transférés en contentieux : agenda judiciaire, échéances, intervenants. Une vue unique sur l'avancement de chaque procédure.",
    href: '#features',
    cta: 'Voir le suivi juridique',
  },
  {
    img: cardContact,
    title: 'Assistance Conformité BCT & CTAF',
    desc: "Veille des circulaires BCT/CTAF et reporting structuré pour vos revues réglementaires. RecovAI assiste vos équipes de conformité ; il ne se substitue ni à elles, ni à vos auditeurs.",
    href: '#features',
    cta: 'Voir le reporting',
  },
];

export default function Problem() {
  return (
    <section id="problem" className="py-24 lg:py-32 bg-paper-soft">
      <div className="container-atr">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-start mb-16">
          <div className="lg:col-span-6">
            <h2 className="h-display mb-0">
              Du premier retard de paiement à la clôture du contentieux, sur une seule plateforme
            </h2>
          </div>
          <div className="lg:col-span-6 lg:pt-3">
            <p className="text-slate text-[17px] leading-[1.7] font-light">
              RecovAI structure l'ensemble du cycle de vie de vos engagements financiers — de l'octroi prudent sous calibrage IFRS 9 au recouvrement amiable et contentieux. Nos modules spécialisés pour le Leasing (Crédit-Bail), le Factoring (Affacturage), et la Microfinance intègrent un scoring de risque intelligent, de la relance cognitive IA et un pilotage juridique sans faille.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {cards.map((c, i) => (
            <motion.a
              key={i}
              href={c.href}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              viewport={{ once: true }}
              className="group block bg-white overflow-hidden rounded-sm shadow-sm hover:shadow-xl transition-all duration-300"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-mist">
                <img
                  src={c.img}
                  alt={c.title}
                  loading="lazy"
                  width={864}
                  height={704}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const fallbacks = [
                      "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=800&q=80", // cardAmiable
                      "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80", // cardContentieux
                      "https://images.unsplash.com/photo-1507537297725-24a1c029d3ca?auto=format&fit=crop&w=800&q=80"  // cardContact
                    ];
                    e.currentTarget.src = fallbacks[i] || "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80";
                  }}
                />
              </div>
              <div className="p-7 lg:p-8">
                <h3 className="font-serif-display text-2xl text-charcoal mb-3 group-hover:text-crimson transition-colors">
                  {c.title}
                </h3>
                <p className="text-slate text-[15px] leading-relaxed mb-6 font-light">
                  {c.desc}
                </p>
                <span className="inline-flex items-center gap-2 text-crimson text-[13px] font-semibold uppercase tracking-wider">
                  {c.cta}
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}
