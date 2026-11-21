const CACHE = 'central-v33';
const ARQUIVOS = [
  './', './index.html', './login.html', './redefinir.html', './css/style.css', './manifest.webmanifest',
  './icons/icone-192.png', './icons/icone-512.png',
  ...['config', 'utils', 'seletor', 'dados', 'nuvem', 'dashboard', 'agenda', 'rotina', 'graficos', 'editor', 'listas', 'cursos',
    'metas', 'colecoes', 'compras', 'compras-dinheiro', 'diario', 'bemestar', 'flashcards', 'simulado', 'financas', 'revisao', 'lixeira', 'imagens', 'arrastar', 'historico', 'limpeza', 'modulos', 'boasvindas', 'exercicios', 'treino', 'pets', 'apps', 'jejum', 'retrospectiva', 'notificacoes', 'configuracoes', 'app', 'login']
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

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { titulo: 'Lembrete', corpo: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.titulo || 'Lembrete', {
    body: d.corpo || '', tag: d.tag || 'aviso', icon: 'icons/icone-192.png', badge: 'icons/icone-192.png', vibrate: [120, 60, 120], data: { url: d.url || './index.html' },
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((janelas) => {
      if (janelas.length) return janelas[0].focus();
      return self.clients.openWindow((e.notification.data && e.notification.data.url) || './index.html#agenda');
    }),
  );
});
