(function(){
var HUB='https://script.google.com/macros/s/AKfycbwvyFm2CsUrDzXGqqItVq8fx3NA-278M4jG9HVcFYgRQ1jg354T2alXY7QHUWAz2VDk/exec';
var SLUG=/^[a-z0-9-]{1,80}$/i, CLE_COURS='cours-autorises', CLE_COMPTE='compte-etat', MAIL=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
var $=function(i){return document.getElementById(i);};
var etat=$('etat'), adresse='', attente=null;
function msg(t,err){etat.textContent=t;etat.className=err?'err':'';}
function voir(id){['e-adresse','e-code','e-compte'].forEach(function(x){$(x).hidden=(x!==id);});var m=document.querySelector('main');if(m)m.classList.toggle('large',id==='e-compte');msg('',false);}
function lire(c){try{return JSON.parse(sessionStorage.getItem(c)||'null');}catch(e){return null;}}
function ecrire(c,v){try{sessionStorage.setItem(c,JSON.stringify(v));}catch(e){}}
function appareil(){var u=navigator.userAgent||'';if(/iPad|Tablet/i.test(u))return 'tablette';if(/Mobi|Android|iPhone/i.test(u))return 'téléphone';return 'ordinateur';}
var ERR={'e-mail invalide':'Cette adresse e-mail n’est pas valide.','patienter':'Trop d’essais. Réessayez dans quelques minutes.','envoi non configuré':'L’envoi des codes n’est pas encore ouvert. Prévenez votre formateur.','envoi impossible':'Le code n’a pas pu être envoyé. Réessayez dans un instant.','code inconnu':'Ce code n’est pas bon. Vérifiez-le ou demandez-en un nouveau.','code expiré':'Ce code a expiré. Demandez-en un nouveau.','trop d’essais':'Trop d’erreurs sur ce code. Demandez-en un nouveau.','session expirée':'Votre vérification a expiré. Saisissez de nouveau votre adresse.','code de classe inconnu':'Ce code de classe n’est pas reconnu. Vérifiez-le auprès de votre formateur.','nom incomplet':'Saisissez votre prénom et votre nom.','liaison non configurée':'Le service n’est pas prêt. Prévenez votre formateur.'};
function appel(corps,essai){
  return fetch(HUB,{method:'POST',body:JSON.stringify(corps)}).then(function(r){return r.json();}).then(function(r){
    if(r&&r.retry&&(essai||0)<2) return new Promise(function(ok){setTimeout(ok,1500);}).then(function(){return appel(corps,(essai||0)+1);});
    return r;
  });
}
function occupe(id,oui){var b=$(id);if(oui)b.setAttribute('aria-busy','true');else b.removeAttribute('aria-busy');b.disabled=!!oui;}
function ouvrir(token,cours,suite){
  ecrire(CLE_COURS,cours);
  var g=document.createElement('form');g.method='post';g.action='/auth';g.style.display='none';
  var a=document.createElement('input');a.type='hidden';a.name='t';a.value=token;g.appendChild(a);
  var b=document.createElement('input');b.type='hidden';b.name='next';b.value=suite;g.appendChild(b);
  document.body.appendChild(g);g.submit();
}
var CLE_PERSO='compte-session', DUREE_PERSO=8*3600*1000; // même durée que l'accès aux cours (8 h)
function garder(st,cours){try{var avant=reprendre()||{};localStorage.setItem(CLE_PERSO,JSON.stringify({prenom:st.prenom||'',nom:st.nom||'',e:adresse||st.e||'',l:st.lecture||avant.l||'',cours:cours,t:st.t||Date.now()}));}catch(e){}}
function reprendre(){try{var o=JSON.parse(localStorage.getItem(CLE_PERSO)||'null');if(o&&Date.now()-(+o.t||0)<DUREE_PERSO)return o;}catch(e){}return null;}
function nb(x){return String(x).replace('.',',');}
function memoriser(r){try{if(r&&/^[A-Z0-9]{6,12}$/.test(String(r.code||'')))localStorage.setItem('suivi-compte',JSON.stringify({c:String(r.code),t:Date.now()}));}catch(e){}}
function propres(l){return (Array.isArray(l)?l:[]).filter(function(c){return c&&SLUG.test(String(c.slug||''));});}
// Barre d'avancement : même aspect que celle de l'Atelier (8 px, fond gris clair, remplissage turquoise) et pourcentage dessous.
function barre(v){
  if(v===null||v===undefined||v===''||isNaN(+v))return null;
  var n=Math.max(0,Math.min(100,Math.round(+v))),w=document.createElement('span');w.className='avancement';
  var b=document.createElement('span');b.className='barre';b.setAttribute('role','progressbar');b.setAttribute('aria-valuemin','0');b.setAttribute('aria-valuemax','100');b.setAttribute('aria-valuenow',String(n));b.setAttribute('aria-label','Avancement dans le module');
  var i=document.createElement('i');i.style.width=n+'%';b.appendChild(i);w.appendChild(b);
  var t=document.createElement('small');t.textContent=n+'\u00a0% du module';w.appendChild(t);return w;
}
// Messages du formateur : un bloc dans la colonne de droite, les non lus en gras ; l'ouverture d'un message le marque comme lu.
function lectureJeton(){var p=reprendre();return p&&p.l?p.l:'';}
function majCache(cours){ecrire(CLE_COURS,cours);var p=reprendre();if(p)garder({prenom:p.prenom,nom:p.nom,t:p.t},cours);}
function marquerLu(cours,c,m,li){
  if(m.lu)return; m.lu=true; li.classList.remove('non-lu');
  c.non_lus=Math.max(0,(+c.non_lus||0)-1);majCache(cours);montrerCompteSansMessages(cours);
  var st=lire(CLE_COMPTE)||{}, corps={action:'compte_lire',ids:[m.id]};if(lectureJeton())corps.lecture=lectureJeton();else if(st.preuve)corps.preuve=st.preuve;else return;
  appel(corps).catch(function(){});
}
function messages(cours){
  var b=$('b-messages'),ul=$('liste-messages');if(!b||!ul)return; ul.textContent='';
  function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!==undefined)e.textContent=x;return e;}
  cours.forEach(function(c){
    var L=Array.isArray(c.messages)?c.messages:[];if(!L.length)return;
    var li=el('li'); li.appendChild(el('strong','',String(c.titre||c.slug).slice(0,120)));
    L.slice(0,10).forEach(function(m){
      var d=el('details','message'+(m.lu?'':' non-lu')),s=el('summary','',(String(m.objet||'Message').slice(0,120))+(m.le?' ('+String(m.le).slice(8,10)+'/'+String(m.le).slice(5,7)+')':''));
      d.appendChild(s);d.appendChild(el('p','com',String(m.texte||'').slice(0,3000)));
      d.addEventListener('toggle',function(){if(d.open)marquerLu(cours,c,m,d);});
      li.appendChild(d);});
    ul.appendChild(li);});
  b.hidden=!ul.children.length;
}
function montrerCompteSansMessages(cours){ // met à jour les pastilles sans refermer les messages ouverts
  var cartes=document.querySelectorAll('#liste li a');
  cours.forEach(function(c,i){var a=cartes[i];if(!a)return;var p=a.querySelector('.pastille');if(p)p.remove();var nl=+c.non_lus||0;if(nl>0){var pa=document.createElement('span');pa.className='pastille';pa.textContent=nl>9?'9+':String(nl);pa.setAttribute('aria-label',nl+(nl>1?' messages non lus':' message non lu'));a.appendChild(pa);}});
}
function montrerCompte(){
  var st=lire(CLE_COMPTE)||{}, cours=propres(lire(CLE_COURS)), ul=$('liste');
  ul.textContent='';
  cours.forEach(function(c){var li=document.createElement('li'),a=document.createElement('a');a.href='/'+c.slug+'/';a.textContent=String(c.titre||c.slug).slice(0,120);var d=String(c.detail||'').slice(0,120);if(d){var pt=document.createElement('small');pt.textContent=d;pt.style.display='block';a.appendChild(pt);}var av=barre(c.avancement);if(av)a.appendChild(av);var nl=+c.non_lus||0;if(nl>0){var pa=document.createElement('span');pa.className='pastille';pa.textContent=nl>9?'9+':String(nl);pa.setAttribute('aria-label',nl+(nl>1?' messages non lus':' message non lu'));a.appendChild(pa);}li.appendChild(a);ul.appendChild(li);});
  messages(cours);
  var lv=$('liste-livrables'); lv.textContent='';
  function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!==undefined)e.textContent=x;return e;}
  cours.forEach(function(c){var x=c.livrable,ns=Array.isArray(c.notes)?c.notes:[];if(!(x&&x.intitule)&&!ns.length)return;
    var li=el('li'); li.appendChild(el('strong','',String(c.titre||c.slug).slice(0,120)));
    if(x&&x.intitule&&!x.evalue) li.appendChild(el('span',x.envoye?'ok':'',(x.envoye?'✓ ':'')+String(x.intitule).slice(0,120)+' : '+(x.envoye?'envoyé au formateur':'pas encore finalisé')));
    ns.slice(0,10).forEach(function(n){
      var d=el('details','note'),s=el('summary','',String(n.livrable||'Note').slice(0,120)+' : '+nb(n.note)+' / '+nb(n.sur)); d.appendChild(s);
      var det=Array.isArray(n.detail)?n.detail:[]; if(det.length){var t=el('table','crit');det.slice(0,30).forEach(function(r){var tr=el('tr');tr.appendChild(el('td','',String(r.critere||'').slice(0,160)));tr.appendChild(el('td','pt',(r.points===null||r.points===undefined?'–':nb(r.points))+(r.max===null||r.max===undefined?'':' / '+nb(r.max))));t.appendChild(tr);});d.appendChild(t);}
      if(n.commentaire) d.appendChild(el('p','com',String(n.commentaire).slice(0,1500)));
      li.appendChild(d);});
    lv.appendChild(li);});
  $('b-livrables').hidden=!lv.children.length;
  $('aucun').hidden=cours.length>0; ul.hidden=!cours.length;
  $('bloc-nom').hidden=!!(st.prenom&&st.nom);
  voir('e-compte');
  $('intro').textContent=st.prenom?('Bonjour '+st.prenom+'.'):'Dernière étape : votre nom, puis le code de classe de votre cours.';
}
function demarrerRenvoi(){
  var b=$('renvoyer'), reste=30; b.disabled=true; clearInterval(attente);
  attente=setInterval(function(){reste--;if(reste<=0){clearInterval(attente);b.disabled=false;b.textContent='Renvoyer le code';}else b.textContent='Renvoyer le code ('+reste+' s)';},1000);
  b.textContent='Renvoyer le code (30 s)';
}
function demander(){
  return appel({action:'compte_demander',email:adresse,appareil:appareil()}).then(function(r){
    if(r&&r.ok){voir('e-code');msg('Un code vient d’être envoyé à '+adresse+'.',false);$('code').value='';try{$('code').focus();}catch(e){}demarrerRenvoi();return;}
    msg((r&&ERR[r.err])||'L’envoi a échoué. Réessayez dans un instant.',true);
  });
}
$('f-adresse').addEventListener('submit',function(e){
  e.preventDefault(); adresse=$('email').value.trim().toLowerCase();
  if(!MAIL.test(adresse)){msg(ERR['e-mail invalide'],true);return;}
  occupe('ok-adresse',true);msg('Envoi du code…',false);
  demander().catch(function(){msg('Le service ne répond pas. Réessayez dans un instant.',true);}).then(function(){occupe('ok-adresse',false);});
});
$('renvoyer').addEventListener('click',function(){occupe('renvoyer',true);msg('Envoi du code…',false);demander().catch(function(){msg('Le service ne répond pas.',true);}).then(function(){$('renvoyer').removeAttribute('aria-busy');});});
$('changer').addEventListener('click',function(){clearInterval(attente);voir('e-adresse');});
$('f-code').addEventListener('submit',function(e){
  e.preventDefault(); var code=$('code').value.replace(/\D/g,'');
  if(code.length!==6){msg('Saisissez le code à 6 chiffres reçu par e-mail.',true);return;}
  occupe('ok-code',true);msg('Vérification en cours…',false);
  appel({action:'compte_verifier',email:adresse,code:code}).then(function(r){
    occupe('ok-code',false);
    if(r&&r.ok&&r.preuve){
      ecrire(CLE_COMPTE,{preuve:r.preuve,prenom:r.prenom||'',nom:r.nom||'',t:Date.now()});memoriser(r);
      var cours=propres(r.cours);garder({prenom:r.prenom,nom:r.nom,lecture:r.lecture},cours);
      if(r.token&&cours.length) ouvrir(String(r.token),cours,'/compte'); else {ecrire(CLE_COURS,[]);montrerCompte();}
      return;
    }
    msg((r&&ERR[r.err])||'La vérification a échoué. Réessayez.',true);
  }).catch(function(){occupe('ok-code',false);msg('Le service ne répond pas. Réessayez dans un instant.',true);});
});
$('f-ajout').addEventListener('submit',function(e){
  e.preventDefault();
  var st=lire(CLE_COMPTE)||{}, classe=$('classe').value.toUpperCase().replace(/[^A-Z0-9]/g,'');
  if(classe.length<6){msg('Saisissez le code de classe de votre cours.',true);return;}
  if(!st.preuve||Date.now()-(st.t||0)>25*60*1000){ // preuve d'adresse périmée : un nouveau code est envoyé, le code de classe est gardé
    try{sessionStorage.setItem('classe-attente',classe);}catch(x){}
    var p=reprendre(); if(p&&p.e&&MAIL.test(p.e)){adresse=p.e;occupe('ok-ajout',true);msg('Envoi du code…',false);
      demander().then(function(){if(!$('e-code').hidden)msg('Pour ajouter un cours, confirmez votre adresse : un code vient d’être envoyé à '+adresse+'.',false);}).catch(function(){msg('Le service ne répond pas. Réessayez dans un instant.',true);}).then(function(){occupe('ok-ajout',false);});return;}
    try{sessionStorage.removeItem(CLE_COMPTE);}catch(x){}voir('e-adresse');msg(ERR['session expirée'],true);return;}
  var prenom=(st.prenom||$('prenom').value).trim(), nom=(st.nom||$('nom').value).trim();
  if(prenom.length<2||nom.length<2){msg(ERR['nom incomplet'],true);return;}
  occupe('ok-ajout',true);msg('Inscription en cours…',false);
  appel({action:'compte_inscrire',preuve:st.preuve,classe:classe,prenom:prenom,nom:nom}).then(function(r){
    occupe('ok-ajout',false);
    if(r&&r.ok&&r.token&&r.ajoute&&SLUG.test(String(r.ajoute))){
      ecrire(CLE_COMPTE,{preuve:r.preuve||st.preuve,prenom:r.prenom||prenom,nom:r.nom||nom,t:st.t});memoriser(r);
      garder({prenom:r.prenom||prenom,nom:r.nom||nom,lecture:r.lecture},propres(r.cours));
      ouvrir(String(r.token),propres(r.cours),'/'+r.ajoute+'/');return;
    }
    msg((r&&ERR[r.err])||'L’inscription a échoué. Réessayez.',true);
  }).catch(function(){occupe('ok-ajout',false);msg('Le service ne répond pas. Réessayez dans un instant.',true);});
});
$('quitter').addEventListener('submit',function(){try{sessionStorage.removeItem(CLE_COURS);sessionStorage.removeItem(CLE_COMPTE);localStorage.removeItem('suivi-compte');localStorage.removeItem(CLE_PERSO);sessionStorage.removeItem('classe-attente');}catch(e){}});
// Lien « ?classe=CODE » : le code est déjà rempli.
var q=/[?&]classe=([A-Za-z0-9]{6,10})/.exec(location.search); if(q)$('classe').value=q[1].toUpperCase();
var st0=lire(CLE_COMPTE), p0=reprendre();
try{var ca=sessionStorage.getItem('classe-attente');if(ca&&!q){$('classe').value=ca;}sessionStorage.removeItem('classe-attente');}catch(e){}
if(st0&&st0.preuve&&Date.now()-(st0.t||0)<25*60*1000) montrerCompte();
else if(p0){ecrire(CLE_COURS,propres(p0.cours));ecrire(CLE_COMPTE,{preuve:'',prenom:p0.prenom,nom:p0.nom,t:0});adresse=p0.e||'';montrerCompte();} // 8 h : le compte reste affiché ; un nouveau code n'est demandé que pour ajouter un cours
else voir('e-adresse');
// Une session gardée sur l'appareil peut dater de plusieurs heures : on relit l'avancement et les messages (preuve de lecture de 8 h).
(function(){var l=lectureJeton();if(!l||$('e-compte').hidden)return;
  appel({action:'compte_lire',lecture:l,ids:[]}).then(function(r){if(r&&r.ok&&Array.isArray(r.cours)){var c=propres(r.cours);majCache(c);montrerCompte();}}).catch(function(){});
})();
})();
