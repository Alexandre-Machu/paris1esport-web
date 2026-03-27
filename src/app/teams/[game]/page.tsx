import { redirect } from 'next/navigation';

const gameMap: Record<string, string> = {
  lol: 'League Of Legends',
  valorant: 'Valorant',
  cs: 'Counter-Strike',
  'counter-strike': 'Counter-Strike',
  ow: 'Overwatch',
  overwatch: 'Overwatch',
  fgc: 'FGC',
  tft: 'TFT',
  'rocket-league': 'Rocket League'
};

export default function TeamGamePage({ params }: { params: { game: string } }) {
  const key = params.game.toLowerCase();
  const game = gameMap[key];

  if (!game) {
    redirect('/teams');
  }

  redirect(`/teams?game=${encodeURIComponent(game)}`);
}
