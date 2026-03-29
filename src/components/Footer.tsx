export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <p className="font-display text-sm font-bold uppercase tracking-[0.08em] text-gray-900">Paris 1 Esport</p>
          <p className="text-sm text-gray-600">Association étudiante:<br />compétition, événements & communauté.</p>
        </div>
        <div className="flex flex-wrap gap-6 text-sm font-semibold">
          <a href="https://discord.gg/gbnWXxxkqK" className="text-gray-600 transition hover:text-brand-primary" target="_blank" rel="noopener noreferrer">Discord</a>
          <a href="https://x.com/paris1esport" className="text-gray-600 transition hover:text-brand-primary" target="_blank" rel="noopener noreferrer">X</a>
          <a href="https://instagram.com/paris1esport" className="text-gray-600 transition hover:text-brand-primary" target="_blank" rel="noopener noreferrer">Instagram</a>
          <a href="https://twitch.tv/paris1esport" className="text-gray-600 transition hover:text-brand-primary" target="_blank" rel="noopener noreferrer">Twitch</a>
          <a href="https://www.tiktok.com/@paris1esport" className="text-gray-600 transition hover:text-brand-primary" target="_blank" rel="noopener noreferrer">TikTok</a>
          <a href="https://linkedin.com/company/paris1esport" className="text-gray-600 transition hover:text-brand-primary" target="_blank" rel="noopener noreferrer">LinkedIn</a>
          <a href="mailto:contact@paris1esport.fr" className="text-gray-600 transition hover:text-brand-primary">Contact</a>
        </div>
      </div>
      <div className="border-t border-gray-200 px-4 py-4 text-center text-xs text-gray-500">
        <p>© 2026 Paris 1 Esport. Tous droits réservés.</p>
      </div>
    </footer>
  );
}
