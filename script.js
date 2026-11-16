/* pierrickbriand.fr : comportements de l'accueil (JavaScript pur, sans dépendance) */
(() => {
  'use strict';

  /* ------------------------------------------------------------------
     Réglages. Tant que "endpoint" est vide, les formulaires ouvrent la
     messagerie du visiteur avec un message prêt à envoyer (aucun faux
     « envoyé »). Pour les relier à l'Atelier du formateur, renseigne
     l'adresse du service : le formulaire enverra alors les données en
     JSON (méthode POST).
     ------------------------------------------------------------------ */
  const CONFIG = { email: 'pierrick.briand@gmail.com', rdv: 'https://calendar.app.google/65meyYWGSbjqdfsQA', endpoint: 'https://script.google.com/macros/s/AKfycbwvyFm2CsUrDzXGqqItVq8fx3NA-278M4jG9HVcFYgRQ1jg354T2alXY7QHUWAz2VDk/exec' };

  const NB = ' ';
  const EURO = NB + '€';
  const $ = (sel, racine = document) => racine.querySelector(sel);
  const $$ = (sel, racine = document) => Array.from(racine.querySelectorAll(sel));
  const nombre = (x) => Math.round(x).toLocaleString('fr-FR');
  const borne = (x, a, b) => Math.min(b, Math.max(a, x));
  const emailValide = (v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test((v || '').trim());

  /* ---------------------------- Démo à trois curseurs ---------------------------- */
  function demo() {
    const tarifEl = $('#d-tarif');
    if (!tarifEl) return;
    const equipeEl = $('#d-equipe');
    const budgetEl = $('#d-budget');
    let touche = false;

    const calcul = () => {
      const tarif = Number(tarifEl.value);
      const equipe = Number(equipeEl.value);
      const budget = Number(budgetEl.value);
      const occ = borne(0.58 + (135 - tarif) * 0.0035 + budget * 0.00003 + (equipe - 4) * 0.012, 0.15, 0.95);
      const ca = 40 * 90 * occ * tarif;
      const res = ca - (150000 + equipe * 90 * 130 + budget);
      const sat = borne(55 + (equipe - 4) * 5 - Math.max(0, tarif - 140) * 0.25 + budget / 200, 20, 98);

      $('#o-tarif').textContent = tarif + EURO;
      $('#o-equipe').textContent = String(equipe);
      $('#o-budget').textContent = nombre(budget) + EURO;
      $('#m-occ').textContent = Math.round(occ * 100) + NB + '%';
      $('#m-sat').textContent = Math.round(sat) + NB + '%';
      $('#m-ca').textContent = nombre(ca) + EURO;
      const resEl = $('#m-res');
      resEl.textContent = nombre(res) + EURO;
      resEl.style.color = res >= 0 ? '#9BE3D8' : '#F6B8C6';

      $('#demo-message').textContent = !touche
        ? 'Essayez : déplacez un curseur et regardez le résultat bouger.'
        : res >= 0
          ? 'Avec ces choix, le trimestre dégage ' + nombre(res) + EURO + '. Vos apprenants testent ainsi leurs décisions, sans risque.'
          : 'Ces choix creusent un déficit de ' + nombre(-res) + EURO + '. La simulation fait découvrir cela sans risque.';
    };

    [tarifEl, equipeEl, budgetEl].forEach((el) => el.addEventListener('input', () => { touche = true; calcul(); }));
    calcul();
  }

  /* ----------------- Profil, devis en trois questions, formulaires ----------------- */
  const PROFILS = [
    { nom: 'Organisme de formation', msg: 'Renforcer vos formations par la pratique, avec un suivi par session.', cible: 'mon organisme' },
    { nom: 'Enseignement supérieur ou CFA', msg: 'Faire appliquer les notions et les relier à la réalité de l’entreprise.', cible: 'mon établissement' },
    { nom: 'Entreprise', msg: 'Former des équipes aux décisions de leur métier, en quelques heures.', cible: 'mon entreprise' },
    { nom: 'Secteur public', msg: 'Former des agents aux arbitrages du quotidien, service par service.', cible: 'ma structure' }
  ];
  const PROFIL_PAR_DEFAUT = 'Choisissez votre profil : les exemples et la demande de devis s’adaptent.';
  const QUESTIONS = [
    { titre: 'Vous êtes…', choix: PROFILS.map((p) => p.nom) },
    { titre: 'Quel est votre public ?', choix: ['BTS ou Bachelor', 'Master ou Mastère', 'Salariés ou agents en poste'] },
    { titre: 'De combien de temps disposez-vous ?', choix: ['Une demi-journée', 'Une journée', 'Plusieurs séances'] }
  ];

  const reponses = [-1, -1, -1];
  let envoye = false;
  let mailDevis = '';
  let erreurDevis = '';
  let messageFinal = '';

  const recap = () => reponses.some((r) => r < 0)
    ? ''
    : QUESTIONS[0].choix[reponses[0]] + ', ' + QUESTIONS[1].choix[reponses[1]].toLowerCase() + ', ' + QUESTIONS[2].choix[reponses[2]].toLowerCase() + '.';

  function el(tag, props = {}, ...enfants) {
    const n = document.createElement(tag);
    Object.entries(props).forEach(([k, v]) => {
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    });
    enfants.forEach((e) => n.append(e));
    return n;
  }

  /* Envoi : service si "endpoint" est renseigné, sinon messagerie du visiteur. */
  async function transmettre(sujet, lignes, donnees) {
    if (CONFIG.endpoint) {
      try {
        // Corps en texte brut : le navigateur n'envoie pas de pré-requête, ce que l'Atelier (Apps Script) exige.
        const r = await fetch(CONFIG.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(Object.assign({ action: 'collecte', consentement: true }, donnees))
        });
        const rep = await r.json();
        if (rep && rep.ok) return 'service';

      } catch (e) { /* repli sur la messagerie */ }
    }
    window.location.href = 'mailto:' + CONFIG.email + '?subject=' + encodeURIComponent(sujet) + '&body=' + encodeURIComponent(lignes.join('\n'));
    return 'messagerie';
  }
  const texteConfirmation = (mode) => mode === 'service'
    ? 'Merci, votre demande est notée. Réponse sous 48 heures ouvrées.'
    : 'Votre messagerie s’ouvre avec le message prêt. Il ne part qu’après votre clic sur « Envoyer ».';

  function rendreDevis() {
    const carte = $('#devis-carte');
    if (!carte) return;
    carte.replaceChildren();
    const etape = reponses.findIndex((r) => r < 0);

    if (envoye) {
      carte.append(
        el('h3', { text: 'Merci.' }),
        el('p', { class: 'confirmation', text: messageFinal }),
        el('p', { class: 'recap', text: recap() }),
        el('a', { class: 'bouton bouton-clair bouton-rdv', href: CONFIG.rdv, target: '_blank', rel: 'noopener', text: 'Choisir un créneau de 30 minutes' })
      );
      return;
    }

    if (etape !== -1) {
      const q = QUESTIONS[etape];
      const liste = el('div', { class: 'choix' });
      q.choix.forEach((nom, i) => liste.append(el('button', {
        type: 'button',
        text: nom,
        onclick: () => { reponses[etape] = i; rendreDevis(); }
      })));
      carte.append(el('p', { class: 'progression', text: 'Question ' + (etape + 1) + ' sur 3' }), el('h3', { text: q.titre }), liste);
      return;
    }

    const champ = el('input', { id: 'd-mail', type: 'email', autocomplete: 'email', placeholder: 'Votre adresse e-mail', value: mailDevis });
    champ.addEventListener('input', () => { mailDevis = champ.value; });
    const err = el('p', { class: 'erreur', role: 'alert', text: erreurDevis });
    const envoyer = async () => {
      if (!emailValide(mailDevis)) { erreurDevis = 'Indiquez une adresse e-mail valide.'; rendreDevis(); $('#d-mail').focus(); return; }
      erreurDevis = '';
      const mode = await transmettre(
        'Demande de devis : simulation',
        ['Bonjour,', '', 'Je souhaite un devis pour une simulation.', 'Profil : ' + QUESTIONS[0].choix[reponses[0]], 'Public : ' + QUESTIONS[1].choix[reponses[1]], 'Temps disponible : ' + QUESTIONS[2].choix[reponses[2]], 'Mon adresse : ' + mailDevis.trim()],
        { type: 'devis', profil: QUESTIONS[0].choix[reponses[0]], public: QUESTIONS[1].choix[reponses[1]], duree: QUESTIONS[2].choix[reponses[2]], email: mailDevis.trim() }
      );
      messageFinal = texteConfirmation(mode);
      envoye = true;
      rendreDevis();
    };
    carte.append(
      el('p', { class: 'progression', text: 'Dernière étape' }),
      el('h3', { text: 'Où vous répondre ?' }),
      el('p', { class: 'recap', text: recap() }),
      el('label', { for: 'd-mail', text: 'Votre adresse e-mail' }),
      champ,
      err,
      el('p', { class: 'mention', text: 'En envoyant, vous acceptez d’être recontacté au sujet de votre demande. Votre adresse est conservée 12 mois au plus et effacée sur simple demande.' }),
      el('div', { class: 'actions' },
        el('button', { type: 'button', class: 'bouton bouton-clair', text: 'Envoyer ma demande', onclick: envoyer }),
        el('button', { type: 'button', class: 'bouton bouton-fantome', text: 'Recommencer', onclick: () => { reponses.fill(-1); erreurDevis = ''; rendreDevis(); } })
      )
    );
  }

  function profils() {
    const boutons = $$('[data-profil]');
    if (!boutons.length) return;
    const message = $('#profil-message');
    const cta = $('#profil-cta');
    message.textContent = PROFIL_PAR_DEFAUT;
    boutons.forEach((b) => b.addEventListener('click', () => {
      const i = Number(b.dataset.profil);
      boutons.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      message.textContent = PROFILS[i].msg;
      cta.textContent = 'Demander un devis pour ' + PROFILS[i].cible;
      reponses[0] = i;
      if (!envoye) rendreDevis();
    }));
  }

  function guide() {
    const form = $('#form-guide');
    if (!form) return;
    const champ = $('#g-mail');
    const erreur = $('#g-erreur');
    const merci = $('#g-merci');
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      if (!emailValide(champ.value)) { erreur.textContent = 'Indiquez une adresse e-mail valide.'; champ.focus(); return; }
      erreur.textContent = '';
      const mode = await transmettre(
        'Guide gratuit : stratégies de positionnement',
        ['Bonjour,', '', 'Je souhaite recevoir le guide « Stratégies de positionnement ».', 'Mon adresse : ' + champ.value.trim()],
        { type: 'guide', email: champ.value.trim(), piege: ($('#g-piege') || {}).value || '' }
      );
      merci.textContent = mode === 'service'
        ? 'Merci. Le guide arrive dans votre boîte de réception.'
        : 'Votre messagerie s’ouvre avec le message prêt. Il ne part qu’après votre clic sur « Envoyer ».';
      merci.hidden = false;
    });
  }

  /* ------------------ Démonstration : accès envoyé par e-mail ------------------ */
  function demonstration() {
    const form = $('#form-demo');
    if (!form) return;
    const erreur = $('#dm-erreur');
    const merci = $('#dm-merci');
    const bouton = $('button[type="submit"]', form);
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const prenom = $('#dm-prenom').value.trim(), nom = $('#dm-nom').value.trim(), orga = $('#dm-orga').value.trim(), mail = $('#dm-mail').value.trim();
      erreur.textContent = '';
      if (!prenom || !nom) { erreur.textContent = 'Indiquez votre prénom et votre nom.'; return; }
      if (!emailValide(mail)) { erreur.textContent = 'Indiquez une adresse e-mail valide.'; $('#dm-mail').focus(); return; }
      if (!$('#dm-accord').checked) { erreur.textContent = 'Cochez la case pour recevoir votre accès.'; return; }
      bouton.disabled = true;
      let rep = null;
      try {
        const r = await fetch(CONFIG.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'collecte', type: 'demo', consentement: true, prenom: prenom, nom: nom, organisme: orga, email: mail, piege: ($('#dm-piege') || {}).value || '' })
        });
        rep = await r.json();
      } catch (e) { rep = null; }
      bouton.disabled = false;
      if (rep && rep.ok) {
        merci.textContent = 'Merci. Votre accès arrive par e-mail dans quelques minutes. Pensez à regarder vos courriers indésirables.';
        merci.hidden = false;
        return;
      }
      const err = rep && rep.err;
      if (err === 'démonstration indisponible') erreur.textContent = 'La démonstration n’est pas ouverte pour le moment. Réservez un échange de 30 minutes ou demandez un devis : je vous réponds sous 48 heures ouvrées.';
      else if (err === 'patienter') erreur.textContent = 'Beaucoup de demandes aujourd’hui. Réessayez demain, ou réservez un échange de 30 minutes.';
      else if (err === 'e-mail invalide') erreur.textContent = 'Cette adresse e-mail n’est pas valide.';
      else {
        // Le service ne répond pas : repli sur la messagerie, avec un message prêt à envoyer.
        window.location.href = 'mailto:' + CONFIG.email + '?subject=' + encodeURIComponent('Accès à la démonstration') + '&body=' + encodeURIComponent(['Bonjour,', '', 'Je souhaite accéder à la démonstration.', 'Nom : ' + prenom + ' ' + nom, 'Organisme : ' + orga, 'Mon adresse : ' + mail].join('\n'));
        merci.textContent = 'Votre messagerie s’ouvre avec le message prêt. Il ne part qu’après votre clic sur « Envoyer ».';
        merci.hidden = false;
      }
    });
  }

  /* ------------------ Apparition au défilement et barre de devis ------------------ */
  function mouvement() {
    const sections = $$('.reveal');
    const calme = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (calme || !('IntersectionObserver' in window)) {
      sections.forEach((s) => s.classList.add('vu'));
    } else {
      document.documentElement.classList.add('js-reveal');
      const io = new IntersectionObserver((entrees) => entrees.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('vu'); io.unobserve(e.target); }
      }), { threshold: 0.08 });
      sections.forEach((s) => io.observe(s));
      setTimeout(() => sections.forEach((s) => s.classList.add('vu')), 4000);
    }

    const barre = $('#barre-devis');
    const zonesMasquantes = [$('.hero'), $('#devis')].filter(Boolean);
    if (barre && zonesMasquantes.length && 'IntersectionObserver' in window) {
      const visibles = new Set();
      const ob = new IntersectionObserver((entrees) => {
        entrees.forEach((e) => (e.isIntersecting ? visibles.add(e.target) : visibles.delete(e.target)));
        barre.classList.toggle('cachee', visibles.size > 0);
      }, { threshold: 0.15 });
      zonesMasquantes.forEach((z) => ob.observe(z));
    }
  }

  demo();
  profils();
  guide();
  demonstration();
  rendreDevis();
  mouvement();
})();
