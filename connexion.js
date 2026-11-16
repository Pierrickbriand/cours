(function(){
var HUB='https://script.google.com/macros/s/AKfycbwvyFm2CsUrDzXGqqItVq8fx3NA-278M4jG9HVcFYgRQ1jg354T2alXY7QHUWAz2VDk/exec';
var SLUG=/^[a-z0-9-]{1,80}$/i, CLE='cours-autorises';
var f=document.getElementById('f'), etat=document.getElementById('etat'), ok=document.getElementById('ok');
function msg(t,err){etat.textContent=t;etat.className=err?'err':'';}
function lire(){try{var v=JSON.parse(sessionStorage.getItem(CLE)||'[]');return Array.isArray(v)?v.filter(function(c){return c&&SLUG.test(String(c.slug||''));}):[];}catch(e){return[];}}
function montrer(){
  var l=lire(), ul=document.getElementById('liste'), bloc=document.getElementById('mes');
  ul.textContent='';
  l.forEach(function(c){var li=document.createElement('li'),a=document.createElement('a');a.href='/'+c.slug+'/';a.textContent=String(c.titre||c.slug).slice(0,120);li.appendChild(a);ul.appendChild(li);});
  bloc.hidden=!l.length;
}
document.getElementById('quitter').addEventListener('submit',function(){try{sessionStorage.removeItem(CLE);}catch(e){}});
montrer();
if(/(^|[?&])acces=requis(&|$)/.test(location.search)) msg('Votre accès a expiré ou ne couvre pas ce cours. Saisissez à nouveau votre code.',true);
var ERR={'code inconnu':'Ce code n’est pas reconnu. Vérifiez-le ou demandez-le à votre formateur.','patienter':'Trop d’essais. Réessayez dans quelques minutes.','e-mail invalide':'Cette adresse e-mail n’est pas valide.','e-mail requis':'Pour ce cours, saisissez aussi votre adresse e-mail : celle que votre école a transmise.','e-mail inconnu':'Cette adresse ne figure pas dans la liste de ce cours. Saisissez celle que votre école a transmise, ou prévenez votre formateur.','aucun cours':'Ce code est reconnu, mais aucun cours n’est ouvert pour le moment.'};
function ouvrir(token,cours){
  try{sessionStorage.setItem(CLE,JSON.stringify(cours));}catch(e){}
  var g=document.createElement('form');g.method='post';g.action='/auth';g.style.display='none';
  var a=document.createElement('input');a.type='hidden';a.name='t';a.value=token;g.appendChild(a);
  var b=document.createElement('input');b.type='hidden';b.name='next';b.value=cours.length===1?'/'+cours[0].slug+'/':'/connexion';g.appendChild(b);
  document.body.appendChild(g);g.submit();
}
function envoyer(essai){
  var mail=document.getElementById('email').value.trim().toLowerCase(), code=document.getElementById('code').value.toUpperCase().replace(/[^A-Z0-9]/g,'');
  return fetch(HUB,{method:'POST',body:JSON.stringify({action:'connexion',email:mail,code:code})}).then(function(r){return r.json();}).then(function(r){
    if(r&&r.retry&&essai<2) return new Promise(function(ok2){setTimeout(ok2,1500);}).then(function(){return envoyer(essai+1);});
    return r;
  });
}
f.addEventListener('submit',function(e){
  e.preventDefault();
  var mail=document.getElementById('email').value.trim(), code=document.getElementById('code').value.toUpperCase().replace(/[^A-Z0-9]/g,'');
  if(mail&&!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)){msg(ERR['e-mail invalide'],true);return;}
  if(code.length<6){msg('Saisissez votre code, de 6 à 8 caractères.',true);return;}
  ok.setAttribute('aria-busy','true');msg('Vérification en cours…',false);
  envoyer(0).then(function(r){
    ok.removeAttribute('aria-busy');
    if(r&&r.ok&&r.token&&Array.isArray(r.cours)&&r.cours.length){ouvrir(String(r.token),r.cours.filter(function(c){return c&&SLUG.test(String(c.slug||''));}));return;}
    if(r&&(r.err==='e-mail requis'||r.err==='e-mail inconnu')){try{document.getElementById('email').focus();}catch(e){}}
    msg((r&&ERR[r.err])||'La connexion a échoué. Réessayez dans un instant.',true);
  }).catch(function(){ok.removeAttribute('aria-busy');msg('Le service ne répond pas. Réessayez dans un instant.',true);});
});
})();
