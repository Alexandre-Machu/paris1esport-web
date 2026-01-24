export const highlights = [
  {
    title: 'League of Legends en priorité',
    desc: '6 équipes étudiantes engagées en ligues (ex: Poro), du master au silver.'
  },
  {
    title: 'Ouvert aux pôles staff',
    desc: 'Event, communication et encadrement esport pour progresser côté orga.'
  },
  {
    title: 'Communauté Paris 1',
    desc: 'Association créée en nov. 2025 pour rassembler les joueur·euse·s de P1.'
  }
];

export const teams = [
  {
    name: 'P1 Tiers 1',
    level: 'Master+',
    record: 'Ligue Poro - en cours',
    game: 'League of Legends',
    players: [
      { name: 'Kalenz', role: 'Top', elo: 'Master', opgg: 'https://op.gg/fr/lol/summoners/euw/Chomp%20Chomp-EUW2', note: 'Capitaine' },
      { name: 'Antoine (Neptune)', role: 'Jungle', elo: 'Master', opgg: 'https://op.gg/fr/lol/summoners/euw/MFF%20NEPTUNE-4387' },
      { name: 'Heats', role: 'Mid', elo: 'Master', opgg: 'https://op.gg/fr/lol/summoners/euw/haets-EUW', note: 'Dispo limitée' },
      { name: 'Erwan (Llykha)', role: 'ADC', elo: 'Master', opgg: 'https://op.gg/fr/lol/summoners/euw/Llykha-EUW', note: 'Joue titulaire' },
      { name: 'Ethan (PoťDeMoutarde)', role: 'Support', elo: 'Master', opgg: 'https://op.gg/fr/lol/summoners/euw/Po%C5%A5DeMoutarde-EUW' }
    ]
  },
  {
    name: 'P1 Mercenaire',
    level: 'Master/Diamond/Emeraude',
    record: 'Ligue Poro - en cours',
    game: 'League of Legends',
    players: [
      { name: 'Nathan (Craksou)', role: 'Top', elo: 'Diamond', opgg: 'https://op.gg/fr/lol/summoners/euw/Craksou-GOAT', note: 'Capitaine' },
      { name: 'Yacine (RoÝ)', role: 'Jungle', elo: 'Master', opgg: 'https://op.gg/fr/lol/summoners/euw/Ro%C3%BD-EGO', note: 'OTP Rengar/Viego' },
      { name: 'Nicolas (LucioJazzy)', role: 'Mid', elo: 'Diamond', opgg: 'https://op.gg/fr/lol/summoners/euw/LucioJazzy-7598' },
      { name: 'Mattis (Random ADC)', role: 'ADC', elo: 'Emeraude', opgg: 'https://op.gg/fr/lol/summoners/euw/Random%20ADC-EGO' },
      { name: 'Colfeo (Sasha)', role: 'Support', elo: 'Emeraude', opgg: 'https://op.gg/fr/lol/summoners/euw/Sasha-AKIRA' }
    ]
  },
  { name: 'P1 au chocolat', level: 'Diamond/Platine', record: 'Ligue Poro - en cours', game: 'League of Legends' },
  { name: 'SKT P1', level: 'Gold/Platine', record: 'Ligue Poro - en cours', game: 'League of Legends' },
  { name: 'P1takill', level: 'Silver/Gold', record: 'Ligue Poro - en cours', game: 'League of Legends' },
  { name: 'Whipp1', level: 'Bronze/Silver', record: 'Ligue Poro - en cours', game: 'League of Legends' }
];

export const events: Array<{
  title: string;
  date: string;
  location: string;
  type: string;
  link?: string;
}> = [];

export const partners = [
  {
    name: 'Université Paris 1 Panthéon-Sorbonne',
    desc: 'Soutien institutionnel universitaire.',
    link: 'https://www.pantheonsorbonne.fr/',
    logo: '/logos/LogoP1_sansfond.png'
  }
];
