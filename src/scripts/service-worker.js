const CACHE_NAME = 'game-cache-v1';
const ASSETS_TO_CACHE = [
  '/', 'index.html', 'src/scripts/index.js', 'src/styles/index.css',
  'src/assets/image/gameBG.png', 'src/assets/image/menuScreen1.png',
  'src/assets/sound/blipSelect.wav', 'src/assets/sound/explosion.wav',
  'src/assets/sound/laserShoot.wav', 'src/assets/sound/reload-gun.mp3',
  'src/assets/sound/powerUp.wav', 'src/assets/sound/Apocalypse - SYBS.mp3',
  'src/assets/sound/hitHurt.wav', 'data/zombies.json', 'data/wave.json'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE)));
});

self.addEventListener('fetch', event => {
  event.respondWith(caches.match(event.request).then(r => r || fetch(event.request)));
});

self.addEventListener('activate', event => {
  const keep = [CACHE_NAME];
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(k => !keep.includes(k)).map(k => caches.delete(k))
  )));
});
