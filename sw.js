const V='infucare-v2',F=['./','index.html','styles.css','app.js','db.js','extras.js','labs.js','manifest.webmanifest','icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(V).then(c=>c.addAll(F)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;
e.respondWith(caches.match(e.request).then(c=>{const n=fetch(e.request).then(r=>{if(r.ok&&new URL(e.request.url).origin===location.origin)caches.open(V).then(x=>x.put(e.request,r.clone()));return r}).catch(()=>c);return c||n}))});
