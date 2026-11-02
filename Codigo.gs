/**
 * Cotizador 3D · Quirón 3D — servidor en Google Apps Script
 *
 * Guarda cotizaciones y pedidos en esta planilla, sube los archivos (STL, fotos, gcode)
 * a una carpeta de tu Drive y agenda las entregas en tu Google Calendar.
 *
 * Instalación (una sola vez):
 *  1. Elegí la función «configurar» arriba y tocá «Ejecutar». Aceptá los permisos.
 *  2. En el «Registro de ejecución» aparece tu CLAVE (se genera sola). Guardala.
 *  3. Implementar › Nueva implementación › Tipo: Aplicación web.
 *     Ejecutar como: Yo · Quién tiene acceso: Cualquier usuario.
 *  4. Copiá la URL que termina en /exec y pegala en el cotizador (botón «Conectar con Google»)
 *     junto con tu CLAVE. Si la olvidás, volvé a ejecutar «configurar» y se muestra de nuevo.
 *
 * Si cambiás este código, volvé a implementar: Implementar › Gestionar implementaciones ›
 * Editar (lápiz) › Versión: Nueva versión › Implementar. La URL no cambia.
 */

const CLAVE = '';                           // vacío = se genera sola al ejecutar «configurar»
const CARPETA = 'Quirón 3D – Pedidos';      // carpeta de Drive para los archivos
const CALENDARIO = '';                      // vacío = tu calendario principal
const PLANILLA_ID = '';                     // vacío = la planilla del script (o se crea una)

const HOJAS = {
  Cotizaciones: ['id', 'Fecha', 'Pieza', 'Material', 'Impresora', 'Piezas/placa', 'Gramos', 'Tiempo (h)', 'Costo u.', 'Precio u.', 'Archivos', 'Actualizado', 'datos'],
  Pedidos: ['id', 'Cliente', 'Contacto', 'Entrega', 'Estado', 'Total', 'Cobrado', 'Saldo', 'Envío', 'Piezas', 'Notas', 'Evento Calendar', 'Actualizado', 'datos'],
  Config: ['clave', 'datos'],
  Imagenes: ['id', 'parte1', 'parte2', 'parte3', 'parte4']
};

/** Ejecutala una vez para crear las hojas, la carpeta y dar permisos. */
function configurar() {
  Object.keys(HOJAS).forEach(hoja);
  carpeta();
  cal().getName();
  const p = PropertiesService.getScriptProperties();
  if (!clave()) p.setProperty('clave', Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().slice(0, 8));
  Logger.log('Tu CLAVE para el cotizador es: ' + clave());
  Logger.log('Listo. Ahora implementá como aplicación web.');
}
function clave() { return CLAVE || PropertiesService.getScriptProperties().getProperty('clave') || ''; }

function doGet() {
  return json({ ok: true, app: 'quiron-cotizador-3d', mensaje: 'El servidor del cotizador está funcionando.' });
}

function doPost(e) {
  let req;
  try { req = JSON.parse(e.postData.contents); } catch (err) { return json({ ok: false, error: 'json' }); }
  const k = clave();
  if (!req || !k || req.key !== k) return json({ ok: false, error: 'clave' });
  const fn = ACCIONES[req.action];
  if (!fn) return json({ ok: false, error: 'accion' });
  const lectura = req.action === 'load' || req.action === 'thumbs' || req.action === 'ping';
  const lock = LockService.getScriptLock();
  try {
    if (!lectura) lock.waitLock(25000);
    return json(Object.assign({ ok: true }, fn(req) || {}));
  } catch (err) {
    return json({ ok: false, error: String((err && err.message) || err) });
  } finally {
    if (!lectura) try { lock.releaseLock(); } catch (e2) {}
  }
}

const ACCIONES = {
  ping: () => ({}),

  load: () => {
    const quotes = filas('Cotizaciones').map(r => leer(r[r.length - 1], r[0])).filter(Boolean);
    const orders = filas('Pedidos').map(r => leer(r[r.length - 1], r[0])).filter(Boolean);
    const config = {};
    filas('Config').forEach(r => { try { config[r[0]] = JSON.parse(r[1]); } catch (e) {} });
    return { quotes, orders, config };
  },

  thumbs: () => {
    const thumbs = {};
    filas('Imagenes').forEach(r => { const s = r.slice(1).join(''); if (r[0] && s) thumbs[r[0]] = s; });
    return { thumbs };
  },

  saveQuote: req => {
    const d = req.data || {}, s = req.summary || {};
    guardar('Cotizaciones', req.id, [req.id, d.date || '', d.name || '', d.material || '', d.printer || '',
      s.perPlate || 1, s.grams || 0, s.hours || 0, s.cost || 0, s.price || 0,
      (d.attachments || []).map(a => a.url).join('\n'), new Date(), JSON.stringify(d)]);
    if (req.thumb) guardar('Imagenes', req.id, [req.id].concat(partes(req.thumb)));
    else if (req.thumb === '') borrar('Imagenes', req.id);
    return {};
  },

  deleteQuote: req => { borrar('Cotizaciones', req.id); borrar('Imagenes', req.id); return {}; },

  saveOrder: req => {
    const d = req.data || {}, s = req.summary || {};
    let ev = d.calEventId || '';
    if (req.calOn) ev = agendar(d, ev, req.calTitle || 'Entrega', req.calDesc || '');
    d.calEventId = ev || null;
    guardar('Pedidos', req.id, [req.id, d.client || '', d.contact || '', d.due ? "'" + d.due : '', d.status || '',
      s.total || 0, s.paid || 0, s.saldo || 0, Number(d.shipping) || 0, s.itemsText || '', d.notes || '',
      ev || '', new Date(), JSON.stringify(d)]);
    return { calEventId: d.calEventId };
  },

  deleteOrder: req => {
    const sh = hoja('Pedidos'), r = filaDe(sh, req.id);
    if (r) {
      const d = leer(sh.getRange(r, HOJAS.Pedidos.length).getValue(), req.id);
      if (d && d.calEventId) quitarEvento(d.calEventId);
      sh.deleteRow(r);
    }
    return {};
  },

  saveConfig: req => { guardar('Config', req.name, [req.name, JSON.stringify(req.value)]); return {}; },

  upload: req => {
    const blob = Utilities.newBlob(Utilities.base64Decode(req.b64), req.mime || 'application/octet-stream', req.name || 'archivo');
    const f = carpeta().createFile(blob);
    return { id: f.getId(), url: f.getUrl() };
  }
};

/* ---------- planilla ---------- */
function libro() {
  const act = SpreadsheetApp.getActive();
  if (act) return act;
  const p = PropertiesService.getScriptProperties();
  const id = PLANILLA_ID || p.getProperty('planilla');
  if (id) return SpreadsheetApp.openById(id);
  const nuevo = SpreadsheetApp.create('Cotizador 3D');
  p.setProperty('planilla', nuevo.getId());
  return nuevo;
}
function hoja(nombre) {
  const ss = libro();
  let sh = ss.getSheetByName(nombre);
  if (!sh) {
    sh = ss.insertSheet(nombre);
    sh.getRange(1, 1, 1, HOJAS[nombre].length).setValues([HOJAS[nombre]]).setFontWeight('bold');
    sh.setFrozenRows(1);
    if (nombre === 'Imagenes' || nombre === 'Config') sh.hideSheet();
  }
  return sh;
}
function filaDe(sh, id) {
  if (!id || sh.getLastRow() < 2) return 0;
  const f = sh.getRange(2, 1, sh.getLastRow() - 1, 1).createTextFinder(String(id)).matchEntireCell(true).findNext();
  return f ? f.getRow() : 0;
}
// Un texto que empieza con = + - @ Sheets lo toma como fórmula: se guarda como texto literal.
function texto(v) { return (typeof v === 'string' && /^[=+\-@]/.test(v)) ? "'" + v : v; }
function guardar(nombre, id, valores) {
  valores = valores.map(texto);
  const sh = hoja(nombre), r = filaDe(sh, id);
  if (r) sh.getRange(r, 1, 1, valores.length).setValues([valores]);
  else sh.appendRow(valores);
}
function borrar(nombre, id) { const sh = hoja(nombre), r = filaDe(sh, id); if (r) sh.deleteRow(r); }
function filas(nombre) {
  const sh = hoja(nombre), n = sh.getLastRow();
  return n < 2 ? [] : sh.getRange(2, 1, n - 1, HOJAS[nombre].length).getValues();
}
function leer(txt, id) { try { const o = JSON.parse(txt); o.id = String(id); return o; } catch (e) { return null; } }
function partes(s) { const out = []; for (let i = 0; i < s.length && out.length < 4; i += 45000) out.push(s.slice(i, i + 45000)); while (out.length < 4) out.push(''); return out; }

/* ---------- Drive ---------- */
function carpeta() {
  const p = PropertiesService.getScriptProperties(), id = p.getProperty('carpeta');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  const it = DriveApp.getFoldersByName(CARPETA);
  const f = it.hasNext() ? it.next() : DriveApp.createFolder(CARPETA);
  p.setProperty('carpeta', f.getId());
  return f;
}

/* ---------- Calendar ---------- */
function cal() { return CALENDARIO ? CalendarApp.getCalendarById(CALENDARIO) : CalendarApp.getDefaultCalendar(); }
function agendar(d, ev, titulo, desc) {
  try {
    const e0 = ev ? cal().getEventById(ev) : null;
    if (d.status === 'Cancelado' || !d.due) { if (e0) e0.deleteEvent(); return ''; }
    const p = String(d.due).split('-'), fecha = new Date(+p[0], +p[1] - 1, +p[2]);
    if (e0) { e0.setTitle(titulo); e0.setDescription(desc); e0.setAllDayDate(fecha); return ev; }
    const e = cal().createAllDayEvent(titulo, fecha, { description: desc });
    e.removeAllReminders(); e.addPopupReminder(900);   // 9:00 del día anterior
    return e.getId();
  } catch (err) { return ev; }
}
function quitarEvento(ev) { try { const e = cal().getEventById(ev); if (e) e.deleteEvent(); } catch (err) {} }

function json(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
