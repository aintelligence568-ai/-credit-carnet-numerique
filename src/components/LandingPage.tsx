import React from 'react';
import { ArrowRight, BookOpen, Check, CreditCard, LockKeyhole, ShieldCheck, Sparkles, WalletCards } from 'lucide-react';

interface LandingPageProps {
  onStart: () => void;
}

const plans = [
  {
    name: 'Mensuel',
    price: '2 500',
    period: '/ mois',
    description: 'La souplesse pour démarrer sans engagement.',
    featured: false,
  },
  {
    name: 'Annuel',
    price: '25 000',
    period: '/ an',
    description: 'Deux mois offerts pour gérer sereinement toute l’année.',
    featured: true,
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => (
  <div className="min-h-full overflow-y-auto bg-[#f7faf8] text-slate-950 custom-scrollbar">
    <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-800 text-white shadow-sm">
          <BookOpen className="size-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-bold tracking-tight">Carnet de Crédit</p>
          <p className="text-[11px] font-medium text-slate-500">Votre commerce, mieux suivi.</p>
        </div>
      </div>
      <button type="button" onClick={onStart} className="hidden rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-emerald-700 hover:text-emerald-800 sm:block">
        Se connecter
      </button>
    </header>

    <main>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-10 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-10 lg:pb-24 lg:pt-20">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-800">
            <Sparkles className="size-3.5" aria-hidden="true" />
            Pensé pour les commerçants
          </div>
          <h1 className="max-w-xl text-4xl font-black leading-[1.04] tracking-[-0.04em] sm:text-5xl lg:text-6xl">
            Reprenez le contrôle de vos crédits clients.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-slate-600 sm:text-lg">
            Centralisez les dettes, les paiements et les relances dans un carnet numérique simple, fiable et toujours à portée de main.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={onStart} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-800 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-900/15 transition hover:bg-emerald-900">
              Commencer gratuitement <ArrowRight className="size-4" aria-hidden="true" />
            </button>
            <a href="#tarifs" className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:text-emerald-800">
              Voir les tarifs
            </a>
          </div>
          <p className="mt-4 text-xs font-medium text-slate-500">1 mois offert à l’ouverture • Aucun engagement</p>
        </div>

        <div className="relative rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_-30px_rgba(15,23,42,0.35)] sm:p-7">
          <div className="absolute -right-3 -top-3 rounded-full bg-amber-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-900 shadow-sm">Simple. Sûr. Pro.</div>
          <div className="rounded-2xl bg-slate-950 p-5 text-white sm:p-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-5">
              <div>
                <p className="text-xs font-medium text-slate-400">Vue d’ensemble</p>
                <p className="mt-1 text-lg font-bold">Mon commerce</p>
              </div>
              <WalletCards className="size-6 text-emerald-300" aria-hidden="true" />
            </div>
            <div className="grid grid-cols-2 gap-3 py-5">
              <div className="rounded-xl bg-white/10 p-4"><p className="text-[11px] text-slate-400">Total restant</p><p className="mt-2 text-xl font-black">83 500</p><p className="mt-1 text-[11px] text-emerald-300">FCFA à récupérer</p></div>
              <div className="rounded-xl bg-emerald-500/15 p-4"><p className="text-[11px] text-slate-400">Paiements reçus</p><p className="mt-2 text-xl font-black text-emerald-300">30 000</p><p className="mt-1 text-[11px] text-slate-400">Ce mois-ci</p></div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 px-4 py-3 text-xs text-slate-300"><ShieldCheck className="size-4 text-emerald-300" /> Données protégées et synchronisées</div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200/80 bg-white px-5 py-14 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-3">
          {[
            ['Suivi clair', 'Visualisez ce qui est dû, reçu et en retard.'],
            ['Relances utiles', 'Retrouvez vos priorités sans fouiller vos carnets.'],
            ['Accès sécurisé', 'Un espace professionnel pour vos données commerciales.'],
          ].map(([title, text]) => <div key={title} className="rounded-2xl border border-slate-200 bg-[#f7faf8] p-5"><p className="text-sm font-bold text-slate-900">{title}</p><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></div>)}
        </div>
      </section>

      <section id="tarifs" className="mx-auto max-w-5xl px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
        <div className="mx-auto max-w-2xl text-center"><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Tarifs transparents</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Un abonnement qui suit votre activité.</h2><p className="mt-4 text-slate-600">Testez l’essentiel gratuitement pendant un mois, puis choisissez le rythme qui vous convient.</p></div>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {plans.map((plan) => <article key={plan.name} className={`relative rounded-2xl border p-6 ${plan.featured ? 'border-emerald-700 bg-emerald-800 text-white shadow-xl shadow-emerald-900/15' : 'border-slate-200 bg-white'}`}>
            {plan.featured && <span className="absolute -top-3 left-6 rounded-full bg-amber-300 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-950">Le plus avantageux</span>}
            <p className={`text-sm font-bold ${plan.featured ? 'text-emerald-100' : 'text-slate-700'}`}>{plan.name}</p>
            <div className="mt-4 flex items-end gap-2"><span className="text-4xl font-black tracking-tight">{plan.price}</span><span className={`pb-1 text-sm ${plan.featured ? 'text-emerald-100' : 'text-slate-500'}`}>FCFA {plan.period}</span></div>
            <p className={`mt-3 text-sm ${plan.featured ? 'text-emerald-100' : 'text-slate-600'}`}>{plan.description}</p>
            <ul className="mt-6 flex flex-col gap-3 text-sm"><li className="flex items-center gap-2"><Check className="size-4 text-emerald-300" /> Clients et crédits illimités</li><li className="flex items-center gap-2"><Check className="size-4 text-emerald-300" /> Suivi des paiements et relances</li><li className="flex items-center gap-2"><Check className="size-4 text-emerald-300" /> Paiement sécurisé via Bictorys</li></ul>
            <button type="button" onClick={onStart} className={`mt-8 w-full rounded-xl px-4 py-3 text-sm font-bold transition ${plan.featured ? 'bg-white text-emerald-900 hover:bg-emerald-50' : 'bg-slate-950 text-white hover:bg-emerald-800'}`}>Choisir {plan.name.toLowerCase()}</button>
          </article>)}
        </div>
        <div className="mt-7 flex items-center justify-center gap-2 text-xs text-slate-500"><LockKeyhole className="size-3.5" /> Encaissement sécurisé • Cartes et Mobile Money via Bictorys</div>
      </section>
    </main>
    <footer className="border-t border-slate-200 px-5 py-6 text-center text-xs text-slate-500">Carnet de Crédit Numérique — Une gestion plus professionnelle, chaque jour.</footer>
  </div>
);
