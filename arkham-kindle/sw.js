self.addEventListener('install',e=>{
e.waitUntil(caches.open('arkham-v01').then(c=>c.addAll([
'index.html',
'game.html',
'css/kindle.css',
'js/storage.js',
'js/game.js'
])));
});

self.addEventListener('fetch',e=>{
e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
