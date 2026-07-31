/**
 * PATRON-MD — Génération locale de session (pairing code)
 * ---------------------------------------------------------
 * À exécuter sur ton PC, une seule fois :
 *
 *     npm install
 *     node pair.js 237690000000        (ton numéro avec indicatif pays, sans +)
 *
 * Le script affiche un code d'appairage à saisir dans :
 *     WhatsApp > Appareils connectés > Connecter un appareil
 *              > Connecter avec un numéro de téléphone
 *
 * Une fois la liaison faite, il écrit ton SESSION_ID dans SESSION_ID.txt
 * et te l'envoie aussi dans ta propre conversation WhatsApp.
 *
 * Ce fichier n'est PAS utilisé par le bot en production.
 */

const fs = require('fs')
const path = require('path')
const readline = require('readline')
const axios = require('axios')
const pino = require('pino')
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require('@whiskeysockets/baileys')

const SESSION_DIR = path.join(__dirname, 'tmp', 'session')
const CREDS_FILE = path.join(SESSION_DIR, 'creds.json')
const OUT_FILE = path.join(__dirname, 'SESSION_ID.txt')

const BROWSER = ['Windows', 'Chrome', '10.0']
const VERSION_URL = 'https://raw.githubusercontent.com/WhiskeySockets/Baileys/master/src/Defaults/baileys-version.json'
const MAX_CODES = 3   // nombre de codes d'appairage avant abandon

const delay = ms => new Promise(r => setTimeout(r, ms))

const REASONS = {
  401: 'session refusée / déconnectée (loggedOut)',
  403: 'numéro refusé par WhatsApp (forbidden)',
  405: 'connexion refusée — version du client rejetée',
  408: 'délai dépassé (timedOut)',
  411: 'incompatibilité multi-appareils',
  428: 'connexion fermée par le serveur',
  440: 'session remplacée par une autre connexion',
  500: 'session corrompue (badSession)',
  503: 'service WhatsApp indisponible',
  515: 'redémarrage requis — normal juste après l\'appairage'
}

const ask = q => new Promise(res => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  rl.question(q, a => { rl.close(); res(String(a).trim()) })
})

function banner (lines) {
  const width = Math.max(...lines.map(l => l.length)) + 4
  console.log('\n' + '='.repeat(width))
  lines.forEach(l => console.log('  ' + l))
  console.log('='.repeat(width) + '\n')
}

/**
 * La version annoncée doit être récente, sinon WhatsApp répond
 * « impossible de se connecter ». On tente la source officielle,
 * puis on retombe sur wa-version.json.
 */
async function resolveVersion () {
  const local = (() => {
    try {
      if (process.env.WA_VERSION) {
        const v = process.env.WA_VERSION.split('.').map(Number)
        if (v.length === 3 && v.every(Number.isFinite)) return v
      }
      return require('./wa-version.json').version
    } catch (e) {
      return [2, 3000, 1035194821]
    }
  })()

  try {
    const { data } = await axios.get(VERSION_URL, { timeout: 8000, responseType: 'json' })
    const v = typeof data === 'string' ? JSON.parse(data).version : data.version
    if (Array.isArray(v) && v.length === 3) {
      if (v.join('.') !== local.join('.')) {
        console.log('ℹ️  Version WhatsApp en ligne : ' + v.join('.') +
                    ' (locale : ' + local.join('.') + ')')
        console.log('    Pense à reporter cette valeur dans wa-version.json.')
      }
      return v
    }
  } catch (e) {
    console.log('ℹ️  Version en ligne inaccessible, utilisation de wa-version.json.')
  }
  return local
}

async function finish (sock) {
  // Baileys écrit les clés de façon asynchrone juste après l'ouverture.
  await delay(6000)

  if (!fs.existsSync(CREDS_FILE)) {
    console.error("❌ creds.json introuvable — l'appairage n'a pas abouti.")
    process.exit(1)
  }

  const creds = fs.readFileSync(CREDS_FILE, 'utf8')
  const sessionId = 'PATRON-MD~' + Buffer.from(creds).toString('base64')

  fs.writeFileSync(OUT_FILE, sessionId)

  banner([
    '✅ Session générée avec succès.',
    '',
    'Ton SESSION_ID a été écrit dans :',
    '   ' + OUT_FILE,
    '',
    'Longueur : ' + sessionId.length + ' caractères',
    '',
    '⚠️  Ne le partage avec personne et ne le commite jamais.',
    '   Quiconque le possède contrôle ton compte WhatsApp.'
  ])

  try {
    const me = sock.user.id.split(':')[0] + '@s.whatsapp.net'
    await sock.sendMessage(me, {
      text: '*PATRON-MD — SESSION ID*\n\nCopie la ligne suivante dans la variable ' +
            "d'environnement SESSION_ID de ton hébergeur :"
    })
    await delay(1500)
    await sock.sendMessage(me, { text: sessionId })
    await delay(3000)
    console.log('📩 SESSION_ID également envoyé dans ta conversation WhatsApp.\n')
  } catch (e) {
    console.log("ℹ️  Envoi WhatsApp impossible — récupère le SESSION_ID dans le fichier ci-dessus.\n")
  }

  process.exit(0)
}

let version = null
let codesRequested = 0
let done = false

async function start (number) {
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR)

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    browser: BROWSER,
    version
  })

  sock.ev.on('creds.update', saveCreds)

  // Tant que l'appareil n'est pas enregistré, il faut un code valide.
  // Un code devient caduc dès que la socket qui l'a émis se ferme.
  if (!sock.authState.creds.registered) {
    if (codesRequested >= MAX_CODES) {
      banner([
        '❌ Échec après ' + MAX_CODES + ' tentatives.',
        '',
        'Pistes :',
        '• Vérifie que le numéro ' + number + ' est bien celui de ce WhatsApp.',
        '• Mets à jour WhatsApp sur ton téléphone.',
        '• Compare wa-version.json avec la version officielle :',
        '  ' + VERSION_URL,
        '• Supprime le dossier tmp/session puis relance.'
      ])
      process.exit(1)
    }

    codesRequested++
    await delay(3000)
    try {
      const code = await sock.requestPairingCode(number)
      const pretty = code?.match(/.{1,4}/g)?.join('-') || code
      banner([
        "CODE D'APPAIRAGE (" + codesRequested + '/' + MAX_CODES + ') : ' + pretty,
        '',
        'Sur ton téléphone :',
        'WhatsApp > Appareils connectés > Connecter un appareil',
        '         > Connecter avec un numéro de téléphone',
        '',
        'Saisis-le maintenant — il expire en quelques minutes.'
      ])
    } catch (e) {
      console.error("❌ Impossible d'obtenir le code :", e?.message || e)
      process.exit(1)
    }
  }

  sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    if (connection === 'open') {
      if (done) return
      done = true
      console.log('🔗 Liaison établie, finalisation…')
      return finish(sock)
    }

    if (connection === 'close') {
      if (done) return

      const status = lastDisconnect?.error?.output?.statusCode
      const why = REASONS[status] || lastDisconnect?.error?.message || 'raison inconnue'
      const registered = !!sock.authState.creds.registered

      console.log('↻ Déconnexion [' + (status ?? '?') + '] ' + why)

      if (status === DisconnectReason.loggedOut || status === 403) {
        console.error('\n❌ WhatsApp a refusé la session. Supprime tmp/session et recommence.')
        return process.exit(1)
      }

      await delay(3000)

      // Enregistré : c'est le 515 attendu, on relance sans nouveau code.
      // Pas encore enregistré : le code précédent est mort, on en redemande un.
      return start(number)
    }
  })
}

async function main () {
  let number = process.argv[2] || await ask('Numéro WhatsApp avec indicatif pays (ex. 237690000000) : ')
  number = String(number).replace(/\D/g, '')

  if (!number) {
    console.error('❌ Numéro manquant.')
    process.exit(1)
  }
  if (number.startsWith('0')) {
    console.error("❌ Utilise l'indicatif pays (237, 33, 234…) au lieu du 0 initial.")
    process.exit(1)
  }

  version = await resolveVersion()
  console.log('Version WhatsApp annoncée : ' + version.join('.'))

  // On repart d'une session vierge pour éviter les creds corrompues.
  if (fs.existsSync(SESSION_DIR)) {
    fs.rmSync(SESSION_DIR, { recursive: true, force: true })
  }
  fs.mkdirSync(SESSION_DIR, { recursive: true })

  await start(number)
}

main().catch(e => {
  console.error('❌ Erreur :', e?.stack || e)
  process.exit(1)
})
