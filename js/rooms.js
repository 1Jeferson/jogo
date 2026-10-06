// Cada sessão começa vazia. Você diz o que entra e eu coloco.
export const rooms = [
  {
    id: "atrio",
    name: "Sala Nós",
    bounds: { minX: -10, maxX: 10, minZ: -10, maxZ: 10 },
    content: "Uma sessão com fotos nossas, nós",
  },
  {
    id: "leste",
    name: "Ala do Jogo",
    bounds: { minX: 10, maxX: 24, minZ: -6, maxZ: 6 },
    content: "Joguinhos juntos",
  },
  {
    id: "oeste",
    name: "Ala das Papadas",
    bounds: { minX: -34, maxX: -10, minZ: -8, maxZ: 8 },
    content: "Acervo de papadas maravilhosas",
  },
  {
    id: "jardim",
    name: "Luzes Internas",
    bounds: { minX: -9, maxX: 9, minZ: 10, maxZ: 32 },
    content: "Luzes pra todo canto",
  },
];

export function roomAt(x, z) {
  return (
    rooms.find(
      (room) =>
        x >= room.bounds.minX &&
        x <= room.bounds.maxX &&
        z >= room.bounds.minZ &&
        z <= room.bounds.maxZ
    ) || rooms[0]
  );
}
