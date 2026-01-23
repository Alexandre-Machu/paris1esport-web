export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-semibold text-slate-800">Paris 1 Esport</p>
          <p>Association étudiante — compétitions, événements et communauté.</p>
        </div>
        <div className="flex gap-4 text-slate-600">
          <a href="https://discord.gg/gbnWXxxkqK" className="hover:text-brand-primary" aria-label="Discord" target="_blank" rel="noopener noreferrer">
            Discord
          </a>
          <a href="https://twitch.tv" className="hover:text-brand-primary" aria-label="Twitch">
            Twitch
          </a>
          <a href="https://instagram.com" className="hover:text-brand-primary" aria-label="Instagram">
            Instagram
          </a>
        </div>
      </div>
    </footer>
  );
}
