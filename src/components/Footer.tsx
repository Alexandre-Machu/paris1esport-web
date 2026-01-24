export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-semibold text-slate-800">Paris 1 Esport</p>
          <p>Association étudiante — compétitions, événements et communauté.</p>
        </div>
        <div className="flex gap-4 text-slate-600">
          <a href="https://discord.gg/gbnWXxxkqK" className="hover:text-brand-primary" aria-label="Discord" target="_blank" rel="noopener noreferrer">Discord</a>
          <a href="https://x.com/paris1esport" className="hover:text-brand-primary" aria-label="X / Twitter" target="_blank" rel="noopener noreferrer">X</a>
          <a href="https://instagram.com/paris1esport" className="hover:text-brand-primary" aria-label="Instagram" target="_blank" rel="noopener noreferrer">Instagram</a>
          <a href="https://twitch.tv/paris1esport" className="hover:text-brand-primary" aria-label="Twitch" target="_blank" rel="noopener noreferrer">Twitch</a>
          <a href="https://www.tiktok.com/@paris1esport" className="hover:text-brand-primary" aria-label="TikTok" target="_blank" rel="noopener noreferrer">TikTok</a>
          <a href="https://linkedin.com/company/paris1esport" className="hover:text-brand-primary" aria-label="LinkedIn" target="_blank" rel="noopener noreferrer">LinkedIn</a>
          <a href="mailto:contact@paris1esport.fr" className="hover:text-brand-primary" aria-label="Contact email">Contact</a>
        </div>
      </div>
    </footer>
  );
}
