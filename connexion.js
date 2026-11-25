(function(){
// Connexion : un seul geste. L'étudiant saisit son adresse e-mail ; la page « Mon compte » envoie le code à 6 chiffres tout de suite.
// La même adresse crée le compte la première fois et le rouvre ensuite. Le cours s'ajoute ensuite sur « Mon compte », avec le code de classe.
var MAIL=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, expire=/(^|[?&])acces=requis(&|$)/.test(location.search);
var f=document.getElementById('f-compte'), champ=document.getElementById('mail-compte'), etat=document.getElementById('etat-compte');
function msg(t,err){etat.textContent=t;etat.className=err?'err':'';}
// Compte déjà ouvert sur cet appareil (8 h) : directement « Mon compte ».
try{var cs=JSON.parse(localStorage.getItem('compte-session')||'null');
  if(cs&&Date.now()-(+cs.t||0)<8*3600*1000&&!expire){location.replace('/compte');return;}
  if(cs&&MAIL.test(String(cs.e||'')))champ.value=String(cs.e);
}catch(e){}
if(expire) msg('Votre accès a expiré. Saisissez votre adresse e-mail pour recevoir un nouveau code.',true);
f.addEventListener('submit',function(e){
  e.preventDefault();
  var m=champ.value.trim().toLowerCase();
  if(!MAIL.test(m)){msg('Cette adresse e-mail n’est pas valide.',true);return;}
  try{sessionStorage.setItem('compte-email',m);sessionStorage.setItem('compte-auto','1');}catch(x){}
  location.href='/compte';
});
})();
