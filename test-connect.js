/**
 * PATRON-MD — Test de connexion minimal
 * -------------------------------------
 *     node test-connect.js
 *
 * Reprend exactement la configuration de pair.js (qui, elle, a réussi
 * à se connecter), mais sur la session déjà existante, sans appairage
 * et sans rien charger du reste du projet.
 *
 * But : savoir si le refus vient de WhatsApp ou de la configuration
 * du socket dans main.js. Une seule tentative, puis sortie.
 */

const path = require('path')
const pino = require('pino')
const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys')

const SESSION_DIR = path.join(__dirname, 'tmp', 'session')

const version = (() => {
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

async function main () {
  console.log('Dossier de session : ' + SESSION_DIR)
  console.log('Version annoncée   : ' + version.join('.'))

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR)

  console.log('Enregistré         : ' + !!state.creds.registered)
  console.log('Compte             : ' + (state.creds.me?.id || '(aucun)'))
  console.log('\nConnexion en cours…\n')

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    browser: ['Windows', 'Chrome', '10.0'],
    version
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection) console.log('  état : ' + connection)

    if (connection === 'open') {
      console.log('\n✅ CONNECTÉ — ' + sock.user.id)
      console.log('   Le socket fonctionne : le problème est dans main.js.')
      process.exit(0)
    }

    if (connection === 'close') {
      const status = lastDisconnect?.error?.output?.statusCode
      const msg = lastDisconnect?.error?.message
      console.log('\n❌ FERMÉ — code ' + (status ?? '?') + (msg ? ' (' + msg + ')' : ''))
      console.log('   Même configuration que pair.js : le refus vient de WhatsApp.')
      process.exit(1)
    }
  })
}

main().catch(e => {
  console.error('Erreur :', e?.stack || e)
  process.exit(1)
})
