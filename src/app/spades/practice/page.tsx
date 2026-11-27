import { redirect } from 'next/navigation'

// Old link: practice moved to Play a game > Play the computer.
export default function PracticeMoved() {
  redirect('/spades/game/cpu')
}
