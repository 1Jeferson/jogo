// Remove o fundo chroma-key das artes geradas e salva PNG com alfa, recortado.
const path = require("path");
const sharp = require("sharp");

const TOLERANCE = 90;
const ERODE = 2;

async function cut(input, output) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const at = (x, y) => (y * width + x) * 4;

  const border = [];
  for (let x = 0; x < width; x += 1) {
    border.push(at(x, 0), at(x, height - 1));
  }
  for (let y = 0; y < height; y += 1) {
    border.push(at(0, y), at(width - 1, y));
  }
  const key = [0, 1, 2].map((c) => {
    const values = border.map((i) => data[i + c]).sort((a, b) => a - b);
    return values[Math.floor(values.length / 2)];
  });

  const isKey = (i) =>
    Math.abs(data[i] - key[0]) +
      Math.abs(data[i + 1] - key[1]) +
      Math.abs(data[i + 2] - key[2]) <
    TOLERANCE;

  // Flood fill a partir das bordas: preserva cores parecidas com o fundo
  // que estejam dentro do personagem (ex.: o vestido rosa).
  const bg = new Uint8Array(width * height);
  const stack = [];
  const push = (x, y) => {
    const p = y * width + x;
    if (bg[p] || !isKey(p * 4)) return;
    bg[p] = 1;
    stack.push(p);
  };
  for (let x = 0; x < width; x += 1) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    push(0, y);
    push(width - 1, y);
  }
  while (stack.length) {
    const p = stack.pop();
    const x = p % width;
    const y = (p - x) / width;
    if (x > 0) push(x - 1, y);
    if (x < width - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < height - 1) push(x, y + 1);
  }

  // Engorda o fundo alguns pixels para eliminar a franja da cor-chave.
  for (let step = 0; step < ERODE; step += 1) {
    const grown = bg.slice();
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const p = y * width + x;
        if (bg[p]) continue;
        const touching =
          (x > 0 && bg[p - 1]) ||
          (x < width - 1 && bg[p + 1]) ||
          (y > 0 && bg[p - width]) ||
          (y < height - 1 && bg[p + width]);
        if (touching) grown[p] = 1;
      }
    }
    bg.set(grown);
  }

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const p = y * width + x;
      if (bg[p]) {
        data[p * 4 + 3] = 0;
        continue;
      }
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) throw new Error(`nada sobrou em ${input}`);

  await sharp(data, { raw: { width, height, channels: 4 } })
    .extract({
      left: minX,
      top: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    })
    .png()
    .toFile(output);

  const kept = ((maxX - minX + 1) * (maxY - minY + 1)) / (width * height);
  console.log(
    `${path.basename(output)}  chave=rgb(${key})  recorte=${maxX - minX + 1}x${
      maxY - minY + 1
    }  (${(kept * 100).toFixed(0)}% da arte)`
  );
}

const [input, output] = process.argv.slice(2);
cut(input, output).catch((err) => {
  console.error(err.message);
  process.exit(1);
});
