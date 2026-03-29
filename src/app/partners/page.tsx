import { getManagedPartners } from '@/lib/partnerStore';
import Image from 'next/image';

export const revalidate = 60;

export default async function PartnersPage() {
  const partners = await getManagedPartners();

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-12">
      <div className="mb-8 space-y-3">
        <p className="section-title text-[11px] font-semibold text-brand-primary">Partenaires</p>
        <h1 className="font-display text-4xl font-semibold text-slate-900">Soutiens et collaborations</h1>
        <p className="max-w-3xl text-lg text-slate-600">
          Nous travaillons avec des acteurs étudiants, tech et esport pour offrir matériel, visibilité et opportunités aux
          membres de l’association.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {partners.map((partner) => (
          <div key={partner.name} className="card-surface flex flex-col rounded-2xl p-6">
            {partner.logo ? (
              <div className="mb-4 flex h-20 items-center justify-center">
                <Image src={partner.logo} alt={partner.name} width={220} height={80} className="h-full w-auto object-contain" />
              </div>
            ) : (
              <h3 className="text-lg font-semibold text-slate-900">{partner.name}</h3>
            )}
            <p className="mt-2 flex-1 text-sm text-slate-600">{partner.desc}</p>
            <a href={partner.link} className="mt-4 text-sm font-semibold text-brand-primary hover:text-brand-secondary" target="_blank" rel="noopener noreferrer">
              Découvrir
            </a>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-cyan-300/20 bg-gradient-to-r from-[#123556] to-[#165f6d] px-6 py-6 text-white">
        <h3 className="text-xl font-semibold">Devenir partenaire</h3>
        <p className="mt-2 text-sm text-white/85">
          Pack visibilité étudiant, sponsoring matériel, événements co-brandés ou soutien logistique. Nous adaptons les activations
          au calendrier universitaire.
        </p>
        <a href="mailto:contact@paris1esport.fr" className="mt-4 inline-block rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900">
          contact@paris1esport.fr
        </a>
      </div>
    </div>
  );
}
