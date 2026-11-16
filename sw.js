const CACHE = 'central-v1';
const ARQUIVOS = [
  './', './index.html', './login.html', './redefinir.html', './css/style.css', './manifest.webmanifest',
  './icons/icone-192.png', './icons/icone-512.png',
  ...['config', 'utils', 'seletor', 'dados', 'nuvem', 'dashboard', 'agenda', 'rotina', 'graficos', 'editor', 'listas', 'cursos',
    'metas', 'colecoes', 'compras', 'bemestar', 'flashcards', 'financas', 'revisao', 'notificacoes', 'configuracoes', 'app', 'login']
    .map((n) => `./js/${n}.js`),
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((resp) => {
        const copia = resp.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copia));
        return resp;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html'))),
  );
});
