const photo = (file, title, text) => ({
  image: `assets/exhibits/${file}`,
  title,
  text,
});

export const catalog = {
  museu: photo("museu-interior.jpg", "Museu Interior", "A porta de entrada da exposição: um convite para caminhar entre as obras."),
  projetos: photo("personal-projects.jpg", "Projetos pessoais", "Estudos, referências e experiências que formam um estilo próprio."),
  origem: photo("sobre-linha.jpg", "Origens", "Uma linha do tempo sobre família, nascimento e caminhos que formaram o artista."),
  retrato: photo("sobre-foto.jpg", "Retrato", "Um autorretrato cercado de memórias, natureza e humor."),
  pixel: photo("sobre-pixel.jpg", "Autorretrato em pixel", "A mesma história contada em blocos e cores chapadas."),
  skills: photo("skills.jpg", "Técnicas", "Óleo e acrílica: duas linguagens, texturas diferentes."),
  expo: photo("exposicoes.jpg", "Exposições", "O percurso da mostra: origem, ofício, falhas e motivação."),
  galeria: photo("galeria.jpg", "Coleções", "Retratos, paisagens e modos distintos de olhar."),
  melhores: photo("melhores-obras.jpg", "As melhores pinturas", "Uma pequena retrospectiva de paisagens e retratos."),
  obrigado: photo("obrigado.jpg", "Obrigado", "Toda visita termina, mas a próxima obra já espera."),
};

const papada = (n, title, text) => ({
  ...photo(`papada${n}.jpg`, title, text),
  tall: true,
  caption: "série papadas",
});

const jogo = (file, title, text) => ({
  ...photo(file, title, text),
  caption: "série jogo",
});

export const jogos = [
  jogo("jogo.jpg", "O dia que a gente escondeu aquele corpo", "Na neve é mais fácil esconder."),
  jogo("jogo2.jpg", "Friziozinho", "No teu coração é quentinho."),
  jogo("jogo3.jpg", "Gnomos comemorando", "Ó como você tá feliz vendo algo no telescópio."),
  jogo("jogo4.jpg", "UHUUUUUUUUUU", "Feliz um ano pra gente!!!!!!!!!!!!."),
  jogo("jogo5.jpg", "Denguinhoooooo", "Jacuuuuuuuuu."),
  jogo("jogo6.jpg", "Jogo 6", "Nesse jogo temos uma filha orelhuda"),
];

const nosFoto = (file, title, text, tall = true) => ({
  ...photo(file, title, text),
  tall,
  caption: "série nós",
});

export const nos = [
  nosFoto("nos.jpg", "Nossa primeira foto favorita", "Sorriso lindooooooooooooooooooooo."),
  nosFoto("nos2.jpg", "Primeira viajem juntos", "Eu consigo ver o pôr do sol no teu sorriso."),
  nosFoto("no3.jpg", "Caçando estrela", "Meu ser celeste."),
  nosFoto("nos4.jpg", "Tua primeira flôr", "A primeira flôr de muitras outras que irá ganhar."),
  nosFoto("nos5.jpg", "Dia de planetário", "Ainda bem que não ficou pra 2026.", false),
  nosFoto("nos6.jpg", "Ossos do sorriso", "Tudo bem comer no quarto."),
  nosFoto("nos7.jpg", "Uma flôr", "Uma flôr, pra uma flôr."),
  nosFoto("nos8.jpg", "King", "Minha king."),
  nosFoto("nos9.jpg", "Névoa", "A névoa mais quente que já vi."),
  nosFoto("nos10.jpg", "Pintura", "Minha foto favorita."),
  nosFoto("nos11.jpg", "VRUUUM", "Sinta a força."),
  nosFoto("nos12.jpg", "A luta", "Sempre vejo um sabre de luz na tua mão nessa foto."),
  nosFoto("nos13.jpg", "Armada", "Se pega nos zóios."),
  nosFoto("nos14.jpg", ":Amor", "Cantinho de amor."),
  nosFoto("nos15.jpg", "Nós 15", "Tão brilhante quanto a lua."),
  nosFoto("nos16.jpg", "Nós 16", "Nosso pequeno césar.", false),
];

export const papadas = [
  papada(1, "Papada Do segundo aniversário do nenê", "Papada num dia de loucura de pintar o cabelo."),
  papada(2, "Papada em que pareçemos gigantes", "Desse angulo eles quem são gnomos!!"),
  papada(3, "Papada de hiperfoco", "Ela sai de saia e de bicicletinha."),
  papada(4, "Papada com pézinhos na areia", "A gente além da vida de fuinha fazendo pose de papada."),
  papada(5, "Papada do show do Teatro Mágico", "Um dia mágico com nossa papada mais mágica."),
  papada(6, "Papada do show do fresno", "Uma das papadas mais cabeçudas que temos."),
  papada(7, "Nossa primeira papada", "O inicio das fotos de papadas no evento do Pedro!!"),
  papada(8, "Papada de papada", "Papada de papada, papada de papada, papada de papada."),
  papada(9, "Papada", "UÉ, MAS CADÊ O TEU QUEIXO???."),
  papada(10, "Papuda", "Mais um capítulo da série Papadas."),
  papada(11, "Papada 11", "Mais um capítulo da série Papadas."),
];

export const wallWorks = [
  // Sala Nós — fotos nossas, sem repetir
  { ...nos[0], x: -6.8, y: 2.35, z: -9.72, rot: 0 },
  { ...nos[1], x: 0, y: 2.35, z: -9.72, rot: 0 },
  { ...nos[2], x: 6.8, y: 2.35, z: -9.72, rot: 0 },
  { ...nos[3], x: -6.8, y: 2.35, z: 9.72, rot: Math.PI },
  { ...nos[5], x: 6.8, y: 2.35, z: 9.72, rot: Math.PI },

  // Ala do Jogo (leste) — 6 fotos, sem repetir
  { ...jogos[0], x: 23.6, y: 2.25, z: -3.2, rot: -Math.PI / 2 },
  { ...jogos[1], x: 23.6, y: 2.25, z: 0, rot: -Math.PI / 2 },
  { ...jogos[2], x: 23.6, y: 2.25, z: 3.2, rot: -Math.PI / 2 },
  { ...jogos[3], x: 15.2, y: 2.25, z: -5.7, rot: 0 },
  { ...jogos[4], x: 20.4, y: 2.25, z: 5.7, rot: Math.PI },

  // Ala das Papadas (oeste)
  { ...papadas[0], x: -33.72, y: 2.35, z: -5.4, rot: Math.PI / 2 },
  { ...papadas[1], x: -33.72, y: 2.35, z: -1.8, rot: Math.PI / 2 },
  { ...papadas[2], x: -33.72, y: 2.35, z: 1.8, rot: Math.PI / 2 },
  { ...papadas[3], x: -33.72, y: 2.35, z: 5.4, rot: Math.PI / 2 },
  { ...papadas[4], x: -29.2, y: 2.35, z: -7.72, rot: 0 },
  { ...papadas[5], x: -22, y: 2.35, z: -7.72, rot: 0 },
  { ...papadas[6], x: -14.8, y: 2.35, z: -7.72, rot: 0 },
  { ...papadas[7], x: -29.2, y: 2.35, z: 7.72, rot: Math.PI },
  { ...papadas[8], x: -14.8, y: 2.35, z: 7.72, rot: Math.PI },

  // Luzes Internas — o resto das fotos nossas
  { ...nos[6], x: -7.2, y: 2.35, z: 10.4, rot: 0 },
  { ...nos[7], x: 7.2, y: 2.35, z: 10.4, rot: 0 },
  { ...nos[8], x: -8.72, y: 2.35, z: 16.5, rot: Math.PI / 2 },
  { ...nos[9], x: -8.72, y: 2.35, z: 24.5, rot: Math.PI / 2 },
  { ...nos[10], x: 8.72, y: 2.35, z: 16.5, rot: -Math.PI / 2 },
  { ...nos[11], x: 8.72, y: 2.35, z: 24.5, rot: -Math.PI / 2 },
  { ...nos[12], x: -6.4, y: 2.35, z: 31.72, rot: Math.PI },
  { ...nos[13], x: 6.4, y: 2.35, z: 31.72, rot: Math.PI },
];

export const cases = [
  { ...nos[4], x: 5.1, z: -5.2 },
  { ...jogos[5], x: 17.6, z: 2.5, title: "Vitrine do Jogo" },
  { ...papadas[9], x: -22, z: -3.8, title: "Papuda" },
  { ...papadas[10], x: -22, z: 3.8, title: "Papada" },
  { ...nos[14], x: -4.4, z: 21, title: "César" },
  { ...nos[15], x: 4.4, z: 21, title: "Luas" },
];
