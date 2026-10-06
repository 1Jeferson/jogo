import * as THREE from "three";

function pixelSprite(url, height = 1.55) {
  const map = new THREE.TextureLoader().load(url);
  map.colorSpace = THREE.SRGBColorSpace;
  map.magFilter = THREE.NearestFilter;
  map.minFilter = THREE.NearestFilter;
  map.generateMipmaps = false;

  const material = new THREE.SpriteMaterial({
    map,
    transparent: true,
    alphaTest: 0.35,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(height * 0.78, height, 1);
  sprite.center.set(0.5, 0);
  sprite.position.y = 0;
  return sprite;
}

export function createWeasel({ src, height = 1.55 } = {}) {
  const root = new THREE.Group();
  const sprite = pixelSprite(src, height);
  root.add(sprite);
  root.userData.sprite = sprite;
  root.userData.flip = 1;
  return root;
}

export function bobWeasel(weasel, time, walking, vx = 0) {
  const sprite = weasel.userData.sprite;
  if (!sprite) return;
  if (Math.abs(vx) > 0.08) weasel.userData.flip = vx < 0 ? -1 : 1;
  const bounce = walking ? Math.abs(Math.sin(time * 11)) * 0.06 : Math.sin(time * 2.4) * 0.015;
  sprite.position.y = bounce;
  sprite.scale.x = Math.abs(sprite.scale.x) * weasel.userData.flip;
}
