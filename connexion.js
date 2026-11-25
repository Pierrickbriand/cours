(function(){
var HUB='https://script.google.com/macros/s/AKfycbwvyFm2CsUrDzXGqqItVq8fx3NA-278M4jG9HVcFYgRQ1jg354T2alXY7QHUWAz2VDk/exec';
var SLUG=/^[a-z0-9-]{1,80}$/i, CLE='cours-autorises';
var f=document.getElementById('f'), etat=document.getElementById('etat'), ok=document.getElementById('ok');
function msg(t,err){etat.textContent=t;etat.className=err?'err':'';}
function lire(){try{var v=JSON.parse(sessionStorage.getItem(CLE)||'[]');return Array.isArray(v)?v.filter(function(c){return c&&SLUG.test(String(c.slug||''));}):[];}catch(e){return[];}}
function montrer(){
  var l=lire(), ul=document.getElementById('liste'), bloc=document.getElementById('mes');
  ul.textContent='';
  function carte(c){var li=document.createElement('li'),a=document.createElement('a');a.href='/'+c.slug+'/';a.textContent=String(c.titre||c.slug).slice(0,120);if(c.avancement!=null&&c.avancement!==''&&!isNaN(+c.avancement)){var n=Math.max(0,Math.min(100,Math.round(+c.avancement))),w=document.createElement('span'),b=document.createElement('span'),i=document.createElement('i'),t=document.createElement('small');w.className='avancement';b.className='barre';b.setAttribute('role','progressbar');b.setAttribute('aria-valuenow',String(n));b.setAttribute('aria-valuemin','0');b.setAttribute('aria-valuemax','100');b.setAttribute('aria-label','Avancement dans le module');i.style.width=n+'%';b.appendChild(i);t.textContent=n+'\u00a0% du module';w.appendChild(b);w.appendChild(t);a.appendChild(w);}var nl=+c.non_lus||0;if(nl>0){var p=document.createElement('span');p.className='pastille';p.textContent=nl>9?'9+':String(nl);p.setAttribute('aria-label',nl+(nl>1?' messages non lus':' message non lu'));a.appendChild(p);}li.appendChild(a);return li;}
  var vrais=l.filter(function(c){return c.type!=='coach';}),coachs=l.filter(function(c){return c.type==='coach';}),ul2=document.getElementById('liste-coachs'),sep=document.getElementById('sep-coachs');
  vrais.forEach(function(c){ul.appendChild(carte(c));});
  if(ul2){ul2.textContent='';coachs.forEach(function(c){ul2.appendChild(carte(c));});ul2.hidden=!coachs.length;sep.hidden=!(vrais.length&&coachs.length);}
  ul.hidden=!vrais.length;
  bloc.hidden=!l.length;
  // Une fois connecté : on n'affiche que « Mes cours », comme une page à part. Un bouton rouvre le formulaire pour un autre code.
  var form=document.getElementById('bloc-connexion'), prem=document.getElementById('bloc-premiere'), expire=/(^|[?&])acces=requis(&|$)/.test(location.search);
  if(l.length&&!expire){
    form.hidden=true; if(prem)prem.hidden=true;
    if(!document.getElementById('autre-code')){
      var b=document.createElement('button');b.type='button';b.id='autre-code';b.className='bouton bouton-doux';b.textContent='Saisir un autre code';b.style.marginRight='8px';
      b.addEventListener('click',function(){form.hidden=false;if(prem)prem.hidden=false;b.style.display='none';try{document.getElementById('code').focus();}catch(e){}});
      var q=document.getElementById('quitter');q.parentNode.insertBefore(b,q);q.style.display='inline';
    }
  }
}
document.getElementById('quitter').addEventListener('submit',function(){try{sessionStorage.removeItem(CLE);localStorage.removeItem('compte-session');}catch(e){}});
montrer();
try{var cs=JSON.parse(localStorage.getItem('compte-session')||'null');if(cs&&Date.now()-(+cs.t||0)<8*3600*1000&&!/(^|[?&])acces=requis(&|$)/.test(location.search))location.replace('/compte');}catch(e){} // compte par e-mail déjà ouvert : « Mon compte »
if(/(^|[?&])acces=requis(&|$)/.test(location.search)) msg('Votre accès a expiré ou ne couvre pas ce cours. Saisissez à nouveau votre code.',true);
var ERR={'code inconnu':'Ce code n’est pas reconnu. Vérifiez-le ou demandez-le à votre formateur.','patienter':'Trop d’essais. Réessayez dans quelques minutes.','e-mail invalide':'Cette adresse e-mail n’est pas valide.','e-mail requis':'Pour ce cours, saisissez aussi votre adresse e-mail : celle que votre école a transmise.','e-mail inconnu':'Cette adresse ne figure pas dans la liste de ce cours. Saisissez celle que votre école a transmise, ou prévenez votre formateur.','compte requis':'Ce cours utilise un compte par e-mail. Cliquez sur « Créer ou ouvrir mon compte », en haut de cette page.','aucun cours':'Ce code est reconnu, mais aucun cours n’est ouvert pour le moment.'};
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
    // Code de classe d'un cours à compte par e-mail : l'étudiant est conduit sur « Mon compte », son code de classe et son adresse déjà remplis.
    if(r&&r.err==='compte requis'){try{sessionStorage.setItem('classe-attente',code);if(mail)sessionStorage.setItem('compte-email',mail.toLowerCase());sessionStorage.setItem('compte-venu','1');}catch(x){}location.href='/compte';return;}
    if(r&&(r.err==='e-mail requis'||r.err==='e-mail inconnu')){try{document.getElementById('email').focus();}catch(e){}}
    msg((r&&ERR[r.err])||'La connexion a échoué. Réessayez dans un instant.',true);
  }).catch(function(){ok.removeAttribute('aria-busy');msg('Le service ne répond pas. Réessayez dans un instant.',true);});
});
})();
