const { decode } = require("./png");

for (const name of process.argv.slice(2)) {
  const img = decode(name);
  const { width, height, data } = img;
  let opaque = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] > 250) opaque += 1;
  const px = (x, y) => {
    const d = (y * width + x) * 4;
    return [data[d], data[d + 1], data[d + 2], data[d + 3]].join(",");
  };
  console.log(name, `${width}x${height}`, `opaque=${((opaque / (width * height)) * 100).toFixed(1)}%`);
  console.log("  corners:", px(0, 0), px(width - 1, 0), px(0, height - 1), px(width - 1, height - 1));
  console.log("  near-corner samples:", px(4, 4), px(12, 4), px(4, 12), px(20, 20));
}
