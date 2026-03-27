import { ManagedOrgMember } from '@/lib/types';

export const POLE_LABELS: Record<string, string> = {
  'Pole Esport': 'Pole Esport',
  'Pole Event': 'Pole Event',
  'Pole Communication': 'Pole Communication'
};

export const POLE_DESCRIPTIONS: Record<string, string> = {
  'Pole Esport': 'Managers équipes & encadrement',
  'Pole Event': 'Organisation tournois, viewing parties',
  'Pole Communication': 'Contenus, graphisme, réseaux'
};

export const DEFAULT_ORG_MEMBERS: ManagedOrgMember[] = [
  {
    id: 'seed-org-1',
    pole: 'Bureau Executif',
    role: 'Président',
    name: 'Alexandre',
    description:
      'Étudiant en M2 Management Informatique, Volley, piano, scoutisme, moto. Dans l’esport depuis 2018, Jeux préférés : LoL, Celeste, CS2, Pokémon, Mario & Luigi.',
    photo: '/photos/alexandre.png'
  },
  {
    id: 'seed-org-2',
    pole: 'Bureau Executif',
    role: 'Vice-présidente',
    name: 'Marylou',
    description: 'Étudiante en L3 double licence Droit-Histoire, travaille au SSE.',
    photo: '/photos/marylou.png'
  },
  {
    id: 'seed-org-3',
    pole: 'Bureau Executif',
    role: 'Trésorier',
    name: 'Théo',
    description:
      'Etudiant en M1 Droit des affaires - Accompagnement de carrières sportives & e-sportives depuis 2022, e-sport, sport, bénévolat.',
    photo: '/photos/theo.jpg'
  },
  {
    id: 'seed-org-4',
    pole: 'Bureau Executif',
    role: 'Secrétaire',
    name: 'Carles',
    description: 'Organisation administrative et coordination interne.',
    photo: '/photos/carles.jpg'
  },
  {
    id: 'seed-org-5',
    pole: 'Pole Esport',
    role: 'Responsable du pôle',
    name: 'Rilok',
    description: 'Coordination du pôle esport et encadrement des managers LoL/CS/FGC.',
    photo: '/photos/rilok.jpg'
  },
  {
    id: 'seed-org-6',
    pole: 'Pole Esport',
    role: 'Manager LoL',
    name: 'Kalenz',
    description: 'Suivi des équipes LoL et résultats en ligues.',
    photo: '/photos/kalenz.jpg'
  },
  {
    id: 'seed-org-7',
    pole: 'Pole Esport',
    role: 'Manager CS',
    name: 'Baron',
    description:
      'Salut ! Je suis Cédric, 22 ans en M1 d\'archéologie. Je suis le responsable esport CS, mon rôle : encadrer les joueur.ses et former des équipes de niveau équilibrées, gérer la compétition et les entraînements de ces équipes. Je peux aussi donner un coup de main pour tout ce qui est organisation de compet esport si CS est inclu !',
    photo: '/photos/baron.jpg'
  },
  {
    id: 'seed-org-8',
    pole: 'Pole Esport',
    role: 'Manager FGC',
    name: 'Serio',
    description: 'Référent jeux de combat (FGC).',
    photo: '/photos/serio.jpg'
  },
  {
    id: 'seed-org-9',
    pole: 'Pole Event',
    role: 'Responsable du pôle',
    name: 'Julien',
    description: 'Organisation des événements, tournois internes et viewing parties.',
    photo: '/photos/jade.jpg'
  },
  {
    id: 'seed-org-10',
    pole: 'Pole Event',
    role: 'Adjoint Events',
    name: 'Jade',
    description: 'Support logistique et planning.',
    photo: '/photos/rypper.jpg'
  },
  {
    id: 'seed-org-11',
    pole: 'Pole Event',
    role: 'Adjoint Events',
    name: 'NoLifeRat',
    description: 'Coordination des inscriptions et brackets.',
    photo: '/photos/noufe.jpg'
  },
  {
    id: 'seed-org-12',
    pole: 'Pole Event',
    role: 'Adjoint Events',
    name: 'SkyOfPotatoes',
    description: 'Production et régie sur événements.',
    photo: '/photos/skyofpotatoes.jpg'
  },
  {
    id: 'seed-org-13',
    pole: 'Pole Event',
    role: 'Adjoint Events',
    name: 'Hitsuyiko',
    description: 'Gestion salle / accueil joueurs.',
    photo: '/photos/hitsuyiko.jpg'
  },
  {
    id: 'seed-org-14',
    pole: 'Pole Event',
    role: 'Adjoint Events',
    name: 'Avannah',
    description: 'Communication événementielle.',
    photo: '/photos/avannah.jpg'
  },
  {
    id: 'seed-org-15',
    pole: 'Pole Communication',
    role: 'Responsable du pôle',
    name: 'Elias',
    description: 'Stratégie de communication, contenus et gestion des réseaux sociaux.',
    photo: '/photos/elias.jpg'
  },
  {
    id: 'seed-org-16',
    pole: 'Pole Communication',
    role: 'CM',
    name: 'Charlotte',
    description:
      '19 ans en licence d’histoire, je suis community manager ! Mon but dans l’asso est de créer du contenu pour vous donner envie de nous rejoindre ! J’aime particulièrement la peinture et l’art en général !',
    photo: '/photos/charlotte.jpg'
  },
  {
    id: 'seed-org-17',
    pole: 'Pole Communication',
    role: 'Monteur vidéo',
    name: 'Théo',
    description:
      'Monteur et graphiste de 24 ans. Actuellement à l’IEJ de Paris 1 mais toujours prêt à donner un coup de main ou de lancer une game.',
    photo: '/photos/theo2.png'
  },
  {
    id: 'seed-org-18',
    pole: 'Pole Communication',
    role: 'Graphiste',
    name: 'Manon M.',
    description:
      'Coucou moi c’est Manon ! Je suis en master DA, et mon rôle ici est celui de graphiste. Toujours là pour vous cook des petits visuels sympas ! ;)',
    photo: '/photos/manon.jpg'
  },
  {
    id: 'seed-org-19',
    pole: 'Pole Communication',
    role: 'Graphiste',
    name: 'Manon',
    description: 'Identité visuelle et supports print.',
    photo: '/photos/manon.jpg'
  },
  {
    id: 'seed-org-20',
    pole: 'Pole Communication',
    role: 'Graphiste',
    name: 'Jade',
    description: 'Création graphique et déclinaisons.',
    photo: '/photos/jade-graphiste.jpg'
  }
];