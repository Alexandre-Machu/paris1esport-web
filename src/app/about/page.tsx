import Link from 'next/link';

const values = [
  { title: 'Esprit campus', desc: 'Créer des ponts entre filières autour du jeu et de la compétition.' },
  { title: 'Progression', desc: 'Accompagnement des joueurs et des rôles staff (coaching, analyses, ateliers).' },
  { title: 'Ouverture', desc: 'Événements grand public, inclusivité et parité au sein des équipes.' }
];

const milestones = [
  { year: '2023', text: 'Lancement de l’association et première team inter-uni LoL.' },
  { year: '2024', text: 'Création d’une section Valorant et premiers tournois internes.' },
  { year: '2025', text: 'Partenariats étudiants, viewing parties et bootcamps réguliers.' }
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-12">
      <div className="mb-10 space-y-4">
        <p className="text-xs font-semibold uppercase text-brand-primary">À propos</p>
        <h1 className="text-4xl font-semibold text-slate-900">L’association Paris 1 Esport</h1>
        <p className="max-w-3xl text-lg text-slate-700">
          Nous réunissons les étudiants passionnés d’esport pour structurer des rosters compétitifs, organiser des événements sur
          le campus et favoriser l’apprentissage des métiers autour de la scène (cast, prod, graphisme, event).
        </p>
        <div className="flex flex-wrap gap-3 text-sm text-slate-600">
          <span className="rounded-full bg-brand-accent/60 px-3 py-2 font-semibold text-brand-primary">Association loi 1901</span>
          <span className="rounded-full bg-slate-100 px-3 py-2">Ouverte à tous niveaux</span>
          <span className="rounded-full bg-slate-100 px-3 py-2">Staff bénévole encadrant</span>
        </div>
      </div>

      <section className="grid gap-6 md:grid-cols-3">
        {values.map((item) => (
          <div key={item.title} className="card-surface rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
            <p className="mt-2 text-sm text-slate-700">{item.desc}</p>
          </div>
        ))}
      </section>

      <section className="mt-12 grid gap-8 md:grid-cols-[1fr_1.2fr]">
        <div className="card-surface rounded-2xl p-6">
          <h3 className="text-xl font-semibold text-slate-900">Nos missions</h3>
          <ul className="mt-4 space-y-3 text-sm text-slate-700">
            <li>• Encadrer des équipes étudiantes en ligues universitaires et circuits open.</li>
            <li>• Organiser des tournois internes, LANs et viewing parties.</li>
            <li>• Former des bénévoles aux rôles staff : cast, analyse, production, event.</li>
            <li>• Nouer des partenariats pour l’accès au matériel et aux opportunités métier.</li>
          </ul>
        </div>
        <div className="card-surface rounded-2xl p-6">
          <h3 className="text-xl font-semibold text-slate-900">Moments clés</h3>
          <ol className="mt-4 space-y-4">
            {milestones.map((m) => (
              <li key={m.year} className="border-l-2 border-brand-primary/30 pl-4">
                <p className="text-xs font-semibold uppercase text-brand-primary">{m.year}</p>
                <p className="text-sm text-slate-700">{m.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <div className="mt-12 flex flex-wrap gap-4 rounded-2xl bg-gradient-to-r from-brand-primary to-[#102d47] px-6 py-6 text-white">
        <div>
          <h3 className="text-xl font-semibold">Envie de t’impliquer ?</h3>
          <p className="text-sm text-white/80">Staff, bénévolat événementiel, ou première expérience compétitive.</p>
        </div>
        <div className="flex gap-3">
          <Link href="https://discord.gg/gbnWXxxkqK" className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-brand-primary" target="_blank" rel="noopener noreferrer">
            Nous contacter
          </Link>
          <Link href="mailto:contact@paris1esport.fr" className="rounded-full border border-white/40 px-5 py-3 text-sm font-semibold text-white">
            contact@paris1esport.fr
          </Link>
        </div>
      </div>
    </div>
  );
}
