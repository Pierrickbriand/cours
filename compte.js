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
function memoriser(r){try{if(r&&/^[A-Z0-9]{6,12}$/.test(String(r.code||'')))localStorage.setItem('suivi-compte',JSON.stringify({c:String(r.code),t:Date.now()}));}catch(e){}}
function propres(l){return (Array.isArray(l)?l:[]).filter(function(c){return c&&SLUG.test(String(c.slug||''));});}
function montrerCompte(){
  var st=lire(CLE_COMPTE)||{}, cours=propres(lire(CLE_COURS)), ul=$('liste');
  ul.textContent='';
  cours.forEach(function(c){var li=document.createElement('li'),a=document.createElement('a');a.href='/'+c.slug+'/';a.textContent=String(c.titre||c.slug).slice(0,120);var d=String(c.detail||'').slice(0,120);if(d){var pt=document.createElement('small');pt.textContent=d;pt.style.display='block';a.appendChild(pt);}li.appendChild(a);ul.appendChild(li);});
  var lv=$('liste-livrables'); lv.textContent='';
  cours.forEach(function(c){var x=c.livrable;if(!x||!x.intitule)return;var li=document.createElement('li'),t=document.createElement('strong'),e=document.createElement('span');
    t.textContent=String(c.titre||c.slug).slice(0,120);e.textContent=(x.envoye?'✓ ':'')+String(x.intitule).slice(0,120)+' : '+(x.envoye?'envoyé au formateur':'pas encore finalisé');e.className=x.envoye?'ok':'';li.appendChild(t);li.appendChild(e);lv.appendChild(li);});
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
      var cours=propres(r.cours);
      if(r.token&&cours.length) ouvrir(String(r.token),cours,'/compte'); else {ecrire(CLE_COURS,[]);montrerCompte();}
      return;
    }
    msg((r&&ERR[r.err])||'La vérification a échoué. Réessayez.',true);
  }).catch(function(){occupe('ok-code',false);msg('Le service ne répond pas. Réessayez dans un instant.',true);});
});
$('f-ajout').addEventListener('submit',function(e){
  e.preventDefault();
  var st=lire(CLE_COMPTE)||{}, classe=$('classe').value.toUpperCase().replace(/[^A-Z0-9]/g,'');
  if(!st.preuve||Date.now()-(st.t||0)>25*60*1000){try{sessionStorage.removeItem(CLE_COMPTE);}catch(x){}msg(ERR['session expirée'],true);voir('e-adresse');msg(ERR['session expirée'],true);return;}
  if(classe.length<6){msg('Saisissez le code de classe de votre cours.',true);return;}
  var prenom=(st.prenom||$('prenom').value).trim(), nom=(st.nom||$('nom').value).trim();
  if(prenom.length<2||nom.length<2){msg(ERR['nom incomplet'],true);return;}
  occupe('ok-ajout',true);msg('Inscription en cours…',false);
  appel({action:'compte_inscrire',preuve:st.preuve,classe:classe,prenom:prenom,nom:nom}).then(function(r){
    occupe('ok-ajout',false);
    if(r&&r.ok&&r.token&&r.ajoute&&SLUG.test(String(r.ajoute))){
      ecrire(CLE_COMPTE,{preuve:r.preuve||st.preuve,prenom:r.prenom||prenom,nom:r.nom||nom,t:st.t});memoriser(r);
      ouvrir(String(r.token),propres(r.cours),'/'+r.ajoute+'/');return;
    }
    msg((r&&ERR[r.err])||'L’inscription a échoué. Réessayez.',true);
  }).catch(function(){occupe('ok-ajout',false);msg('Le service ne répond pas. Réessayez dans un instant.',true);});
});
$('quitter').addEventListener('submit',function(){try{sessionStorage.removeItem(CLE_COURS);sessionStorage.removeItem(CLE_COMPTE);localStorage.removeItem('suivi-compte');}catch(e){}});
// Lien « ?classe=CODE » : le code est déjà rempli.
var q=/[?&]classe=([A-Za-z0-9]{6,10})/.exec(location.search); if(q)$('classe').value=q[1].toUpperCase();
var st0=lire(CLE_COMPTE);
if(st0&&st0.preuve&&Date.now()-(st0.t||0)<25*60*1000) montrerCompte(); else voir('e-adresse');
})();
