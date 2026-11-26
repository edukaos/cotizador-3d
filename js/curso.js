/* Aviso sutil del curso Capa a Capa: una tarjeta chica abajo a la derecha, a los 2 minutos de uso.
   Frecuencia: como máximo una vez por semana; si la cierran, no vuelve por 30 días. */
(function(){
var URL='https://curso.quiron3d.com/?utm_source=cotizador3d&utm_medium=aviso',KEY='quiron-cotizador-3d-curso',ESPERA=120000,SEMANA=7*864e5,MES=30*864e5;
function leer(){try{return JSON.parse(localStorage.getItem(KEY))||{};}catch(e){return{};}}
function guardar(d){try{localStorage.setItem(KEY,JSON.stringify(d));}catch(e){}}
function toca(){var d=leer(),n=Date.now();return !(d.visto&&n-d.visto<SEMANA)&&!(d.cerrado&&n-d.cerrado<MES);}
function ocupado(){return !!document.querySelector('dialog[open]');}
function mostrar(){
  if(document.getElementById('cursoad'))return;
  var c=document.createElement('div');c.id='cursoad';c.setAttribute('role','complementary');c.setAttribute('aria-label','Curso Capa a Capa');
  c.innerHTML='<button type="button" class="cx" title="Cerrar" aria-label="Cerrar">✕</button><b>Curso Capa a Capa</b><span>Aprendé impresión 3D desde cero, paso a paso.</span><a href="'+URL+'" target="_blank" rel="noopener">Ver el curso →</a>';
  c.querySelector('.cx').onclick=function(){var d=leer();d.cerrado=Date.now();guardar(d);c.classList.remove('on');setTimeout(function(){c.remove();},300);};
  c.querySelector('a').onclick=function(){var d=leer();d.cerrado=Date.now();guardar(d);};
  document.body.appendChild(c);
  requestAnimationFrame(function(){c.classList.add('on');});
  var d=leer();d.visto=Date.now();guardar(d);
}
if(!toca())return;
/* Cuenta solo el tiempo con la pestaña visible; si justo hay algo abierto, reintenta en 20 s. */
var acum=0,ult=Date.now();
var t=setInterval(function(){
  var n=Date.now();if(!document.hidden)acum+=n-ult;ult=n;
  if(acum>=ESPERA&&!ocupado()){clearInterval(t);mostrar();}
},5000);
})();
