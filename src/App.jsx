import { useState } from 'react'
import GameMenu from './components/GameMenu'
import CrayonSnake from './games/CrayonSnake'
import CrayonCircuit from './games/CrayonCircuit'

const GAMES = [
  {
    id: "snake",
    name: "Crayon Snake",
    description: "Pinta tu camino sin salirte del cuaderno",
    icon: "🖍️",
    component: CrayonSnake,
  },
  {
    id: "circuit",
    name: "Crayon Circuit",
    description: "Conecta los puntos de colores sin cruzar",
    icon: "🔴",
    component: CrayonCircuit,
  },
]

export default function App() {
  const [currentGame, setCurrentGame] = useState(null)

  if (currentGame) {
    const game = GAMES.find((g) => g.id === currentGame)
    if (game) {
      const GameComponent = game.component
      return <GameComponent onBack={() => setCurrentGame(null)} />
    }
  }

  return <GameMenu games={GAMES} onSelect={setCurrentGame} />
}
