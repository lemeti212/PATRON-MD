# PATRON-MD — Générer sa session et déployer sur Render

Ce guide remplace l'ancien site d'appairage (`patron-md.vercel.app`), qui n'est plus
en service. Tu génères ta session toi-même, en local, et le bot n'a plus besoin
d'aucun serveur tiers pour démarrer.

---

## Ce qui a changé

Avant, `SESSION_ID` contenait l'identifiant d'un **Gist GitHub appartenant au
développeur du bot** (`gist.githubusercontent.com/Itzpatron/<id>/raw/session.json`).
Le site d'appairage faisait la liaison WhatsApp sur son serveur, déposait ton
`creds.json` sur *son* compte, et te renvoyait l'identifiant.

Deux problèmes : ton bot ne démarrait que si son infrastructure fonctionnait, et
ta session vivait chez quelqu'un d'autre.

Désormais, `SESSION_ID` contient directement ton `creds.json` encodé en base64.
Aucun appel réseau, aucun compte tiers. L'ancien format reste accepté si tu as
encore un identifiant de gist valide.

---

## Correctif de dépendance : `libsignal`

Le paquet `@whiskeysockets/baileys` de ce projet est en réalité un alias vers
`patron-pro`, un fork non officiel de Baileys. Ce fork dépend de
`@shennmine/libsignal-node`, que **npm a retiré le 25 mars 2026** et remplacé par
un « security holding package » vide. Résultat : `npm install` réussit, mais tout
démarrage échoue avec `Error: Cannot find module 'libsignal'`.

`package.json` redirige désormais `libsignal` vers le paquet officiel
[`libsignal@6.0.0`](https://www.npmjs.com/package/libsignal), maintenu par
l'équipe Baileys, qui expose exactement les mêmes fonctions que celles utilisées
par le fork (`ProtocolAddress`, `SessionBuilder`, `SessionCipher`,
`SessionRecord.deserialize`, `curve.*`).

`patron-pro` est aussi passé de `@latest` à `@2.1.5` (version figée) : quand une
dépendance d'un projet vient d'être retirée par npm pour raison de sécurité, il
vaut mieux ne pas laisser la chaîne évoluer toute seule à chaque déploiement.

Si tu as déjà lancé `npm install`, il faut repartir propre :

```powershell
Remove-Item -Recurse -Force node_modules, package-lock.json
npm install
```

---

## Correctif de version : `wa-version.json`

Deuxième blocage, distinct du précédent : `patron-pro` annonce à WhatsApp une
version de client figée au **2.3000.1033105955** (mars 2026). WhatsApp refuse
désormais cette version — l'appairage produit bien un code, mais le téléphone
répond « impossible de se connecter » et la socket se ferme en boucle.

La version courante est lisible ici :
<https://raw.githubusercontent.com/WhiskeySockets/Baileys/master/src/Defaults/baileys-version.json>

Elle est maintenant centralisée dans **`wa-version.json`** à la racine :

- `config.js` la charge dans `global.waVersion` ;
- `main.js` l'utilise à la place de son littéral d'origine ;
- `pair.js` tente de récupérer la version en ligne à chaque exécution et retombe
  sur le fichier si GitHub est injoignable.

Tu peux aussi la surcharger sans toucher au code, via la variable
d'environnement `WA_VERSION` (format `2.3000.1035194821`) — pratique sur Render.

> Si l'appairage recommence à échouer dans quelques mois, c'est presque toujours
> ça : ouvre l'URL ci-dessus et reporte le nouveau tableau dans
> `wa-version.json`.

---

## Étape 1 — Générer la session (sur ton PC, une seule fois)

```bash
npm install
node pair.js 237690000000
```

> L'avertissement `EBADENGINE` (Node 24 alors que le projet demande Node 20) est
> sans conséquence en local. Sur Render, le champ `engines` du `package.json`
> sélectionne automatiquement Node 20.

Remplace `237690000000` par ton numéro **avec l'indicatif pays, sans `+` et sans
le `0` initial**.

Le script affiche un code à 8 caractères. Sur ton téléphone :

> WhatsApp → **Appareils connectés** → **Connecter un appareil** →
> **Connecter avec un numéro de téléphone** → saisir le code

Dès la liaison établie, le script :

- écrit ton `SESSION_ID` dans **`SESSION_ID.txt`** ;
- te l'envoie aussi dans ta propre conversation WhatsApp.

C'est une longue chaîne qui commence par `PATRON-MD~`. Elle fait plusieurs
centaines de caractères — c'est normal, c'est ton `creds.json` encodé.

> ⚠️ **Ne la partage jamais et ne la commite jamais.** Quiconque la possède
> contrôle ton compte WhatsApp. Le `.gitignore` du projet protège déjà
> `SESSION_ID.txt`, `.env` et `tmp/session/`.

---

## Étape 2 — Déployer sur Render

1. Pousse le projet sur GitHub (le `.gitignore` empêche toute fuite de session).
2. Sur [render.com](https://render.com) : **New → Web Service**, connecte le dépôt.
3. Configuration :

   | Champ | Valeur |
   |---|---|
   | Environment | `Node` |
   | Build Command | `npm install` |
   | Start Command | `npm start` |
   | Instance Type | `Free` |

4. Dans **Environment → Environment Variables**, ajoute au minimum :

   | Clé | Valeur |
   |---|---|
   | `SESSION_ID` | le contenu de `SESSION_ID.txt` |
   | `OWNER_NUMBER` | ton numéro (ex. `237690000000`) |
   | `OWNER_NAME` | ton nom |
   | `PREFIX` | `.` |

   Les autres variables du `.env` sont optionnelles, elles ont toutes une valeur
   par défaut dans `config.js`.

5. Déploie. Dans les logs tu dois voir :

   ```
   ✔ Session restaurée depuis SESSION_ID (237690000000)
   ```

   Puis la connexion WhatsApp. Ne définis **pas** de variable `PORT` — Render la
   fournit automatiquement, et `main.js` l'utilise déjà.

---

## Étape 3 — Empêcher la mise en veille (indispensable sur le plan gratuit)

Une instance Render gratuite s'éteint après **15 minutes sans trafic HTTP**, ce
qui coupe la connexion WhatsApp. `main.js` expose déjà une route `/` qui répond
`Bot is running!`, prévue exactement pour ça.

Sur [uptimerobot.com](https://uptimerobot.com) (gratuit) :

- **New Monitor** → type **HTTP(s)**
- URL : l'adresse `.onrender.com` de ton service
- Intervalle : **10 minutes**

Le plan gratuit de Render offre 750 heures par mois et par workspace, soit
environ 31 jours. Un seul service tournant en permanence tient tout juste dans
cette limite — n'héberge rien d'autre sur le même compte.

---

## Points à connaître

**Persistance.** Le plan gratuit de Render n'a pas de disque persistant. À chaque
redémarrage ou redéploiement, `tmp/session/` est effacé puis reconstruit à partir
de `SESSION_ID`. Les clés que Baileys met à jour en cours de fonctionnement sont
donc perdues. En pratique WhatsApp réaccepte la session initiale, mais si le bot
finit par être déconnecté après plusieurs semaines, il suffit de relancer
`node pair.js` pour en régénérer une.

**Un seul appareil.** Générer une nouvelle session ne déconnecte pas l'ancienne.
Pense à retirer les anciens appareils dans WhatsApp → Appareils connectés.

**Migration vers un hébergeur payant.** Rien à changer : `SESSION_ID` fonctionne
à l'identique sur Railway, Fly.io, Koyeb, Heroku, un VPS ou en Docker.

---

## Dépannage

| Message dans les logs | Cause | Solution |
|---|---|---|
| `Session ID not found` | `SESSION_ID` absent | Ajoute la variable dans Render |
| `Invalid session ID` | ne commence pas par `PATRON-MD~` | Recopie la chaîne complète |
| `✖ SESSION_ID illisible` | copie tronquée | Recopie tout `SESSION_ID.txt`, sans retour à la ligne |
| `✖ SESSION_ID incomplet` | `creds.json` partiel | Relance `node pair.js <numéro>` |
| `❌ Failed to fetch or save session` | le bot tente encore le gist | Ta chaîne fait 32 caractères hexadécimaux : c'est un ancien id de gist, régénère-la |
| Le bot s'arrête après ~15 min | mise en veille Render | Vérifie qu'UptimeRobot ping bien le service |
| `Cannot find module 'libsignal'` | paquet retiré de npm | Supprime `node_modules` et `package-lock.json`, relance `npm install` |
| « Impossible de se connecter » sur le téléphone | version WhatsApp obsolète | Mets à jour `wa-version.json` depuis la source officielle |
| `↻ Déconnexion [405]` en boucle | version du client rejetée | Idem : `wa-version.json` |
| `↻ Déconnexion [401]` | numéro ou session refusé | Supprime `tmp/session`, vérifie que le numéro est bien celui du téléphone |
