
const chalk = require("chalk")
const fs = require("fs")
require('dotenv').config(); 

//================= { SETTINGS } =================\\
global.prefix = (process.env.PREFIX || ".").trim().split(/\s+/);
// your desired prefix symbol only
global.owner = process.env.OWNER_NUMBER || "2348133729715"; // owner number , for multiple number
global.sudo = process.env.SUDO  || "";
global.ownername = process.env.OWNER_NAME || "Patron TechX"; //set bot owner name here 
global.botname = process.env.BOT_NAME || "ᴘᴀᴛʀᴏɴ-ᴍᴅ"
global.author = process.env.AUTHOR  || "Patron TechX";
global.packname = process.env.PACK_NAME  || "© ᴘᴀᴛʀᴏɴ ᴍᴅ ²⁵";
global.session = process.env.SESSION_ID || ""
global.timezone = process.env.TIME_ZONE || "Africa/Lagos";
global.simbol = process.env.SYMBOL || '🚹';
global.thumb = process.env.THUMB || "https://files.catbox.moe/e71nan.png"
global.footer = process.env.FOOTER || '';
global.warn = process.env.WARN || '4'
global.menutype = process.env.MENU_TYPE || ''
// L'ancien site d'appairage n'est plus en service : la session se génère
// en local avec `node pair.js <numéro>` (voir DEPLOIEMENT.md)
global.scan = 'la commande locale : node pair.js <numéro>'


//======= Don't touch =======\\
global.msg = {
    succes: '✅ 𝘀𝘂𝗰𝗰𝗲𝘀𝘀! 𝘆𝗼𝘂𝗿 𝗿𝗲𝗾𝘂𝗲𝘀𝘁 𝘄𝗮𝘀 𝗰𝗼𝗺𝗽𝗹𝗲𝘁𝗲𝗱.',
    owner: '⚠️ 𝗼𝗻𝗹𝘆 𝘁𝗵𝗲 𝗯𝗼𝘁 𝗼𝘄𝗻𝗲𝗿 𝗰𝗮𝗻 𝘂𝘀𝗲 𝘁𝗵𝗶𝘀 𝗳𝗲𝗮𝘁𝘂𝗿𝗲.',
    admin: '⚠️ 𝘁𝗵𝗶𝘀 𝗰𝗼𝗺𝗺𝗮𝗻𝗱 𝗶𝘀 𝗿𝗲𝘀𝘁𝗿𝗶𝗰𝘁𝗲𝗱 𝘁𝗼 𝗴𝗿𝗼𝘂𝗽 𝗮𝗱𝗺𝗶𝗻𝘀 𝗼𝗻𝗹𝘆.',
    BotAdmin: '⚠️ 𝗶 𝗻𝗲𝗲𝗱 𝘁𝗼 𝗯𝗲 𝗮𝗻 𝗮𝗱𝗺𝗶𝗻 𝘁𝗼 𝗽𝗲𝗿𝗳𝗼𝗿𝗺 𝘁𝗵𝗶𝘀 𝗮𝗰𝘁𝗶𝗼𝗻.',
    group: '❌ 𝘁𝗵𝗶𝘀 𝗳𝗲𝗮𝘁𝘂𝗿𝗲 𝗰𝗮𝗻 𝗼𝗻𝗹𝘆 𝗯𝗲 𝘂𝘀𝗲𝗱 𝗶𝗻 𝗴𝗿𝗼𝘂𝗽𝘀.',
    private: '❌ 𝘁𝗵𝗶𝘀 𝗳𝗲𝗮𝘁𝘂𝗿𝗲 𝗰𝗮𝗻 𝗼𝗻𝗹𝘆 𝗯𝗲 𝘂𝘀𝗲𝗱 𝗶𝗻 𝗽𝗿𝗶𝘃𝗮𝘁𝗲 𝗰𝗵𝗮𝘁.',
    bot: '🤖 𝘁𝗵𝗶𝘀 𝗰𝗼𝗺𝗺𝗮𝗻𝗱 𝗶𝘀 𝗳𝗼𝗿 𝗯𝗼𝘁 𝘂𝘀𝗲 𝗼𝗻𝗹𝘆.',
    wait: '⏳ 𝗽𝗿𝗼𝗰𝗲𝘀𝘀𝗶𝗻𝗴 𝘆𝗼𝘂𝗿 𝗿𝗲𝗾𝘂𝗲𝘀𝘁, 𝗽𝗹𝗲𝗮𝘀𝗲 𝘄𝗮𝗶𝘁...',
    ban: '🚫 𝘆𝗼𝘂 𝗮𝗿𝗲 𝗯𝗮𝗻𝗻𝗲𝗱 𝗳𝗿𝗼𝗺 𝘂𝘀𝗶𝗻𝗴 𝗰𝗼𝗺𝗺𝗮𝗻𝗱𝘀. 𝗰𝗼𝗻𝘁𝗮𝗰𝘁 𝘁𝗵𝗲 𝗼𝘄𝗻𝗲𝗿 𝘁𝗼 𝗹𝗶𝗳𝘁 𝘁𝗵𝗲 𝗯𝗮𝗻.',
    baileys: '⚠️ 𝗱𝘂𝗲 𝘁𝗼 𝗮 𝗿𝗲𝗰𝗲𝗻𝘁 𝗕𝗮𝗶𝗹𝗲𝘆𝘀 𝘂𝗽𝗱𝗮𝘁𝗲, 𝘁𝗵𝗶𝘀 𝗰𝗼𝗺𝗺𝗮𝗻𝗱 𝗰𝗮𝗻 𝗼𝗻𝗹𝘆 𝗯𝗲 𝘂𝘀𝗲𝗱 𝗶𝗻 𝗽𝗿𝗶𝘃𝗮𝘁𝗲 𝗰𝗵𝗮𝘁.',
    gcban: '🚫 𝘁𝗵𝗶𝘀 𝗴𝗿𝗼𝘂𝗽 𝗶𝘀 𝗯𝗮𝗻𝗻𝗲𝗱 𝗳𝗿𝗼𝗺 𝘂𝘀𝗶𝗻𝗴 𝗯𝗼𝘁 𝗰𝗼𝗺𝗺𝗮𝗻𝗱𝘀.'
};

//========= VERSION DU CLIENT WHATSAPP =========\\
// patron-pro annonce une version figée de mars 2026, que WhatsApp refuse
// aujourd'hui (« impossible de se connecter » à l'appairage).
// main.js lit global.waVersion à la place de son littéral d'origine.
global.waVersion = (function () {
    try {
        if (process.env.WA_VERSION) {
            const v = process.env.WA_VERSION.split(".").map(Number);
            if (v.length === 3 && v.every(n => Number.isFinite(n))) return v;
        }
        return require("./wa-version.json").version;
    } catch (e) {
        return [2, 3000, 1035194821];
    }
})();

// WhatsApp fait évoluer cette version très vite et refuse les périmées avec un
// 405. On récupère donc la version courante au démarrage ; wa-version.json ne
// sert que de repli si la source est injoignable.
// Appelé par main.js juste avant startBot().
global.refreshWaVersion = async function () {
    if (process.env.WA_VERSION) return global.waVersion;
    try {
        const res = await require("axios").get(
            "https://raw.githubusercontent.com/WhiskeySockets/Baileys/master/src/Defaults/baileys-version.json",
            { timeout: 10000, responseType: "json" }
        );
        const data = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
        if (Array.isArray(data.version) && data.version.length === 3) {
            global.waVersion = data.version;
        }
    } catch (e) {
        console.log(chalk.yellow("⚠ Version en ligne injoignable, repli sur wa-version.json."));
    }
    console.log(chalk.cyan("→ Version WhatsApp annoncée : " + global.waVersion.join(".")));
    return global.waVersion;
};

console.log(chalk.cyan("→ Version WhatsApp au démarrage : " + global.waVersion.join(".")));

// Délai entre deux tentatives de reconnexion. Le fork retentait toutes les
// 2 secondes : face à un refus 405, ce martèlement aggrave le blocage côté
// WhatsApp et consomme les heures de l'hébergeur pour rien.
global.reconnectDelay = Math.max(2000, Number(process.env.RECONNECT_DELAY) || 20000);

//========= PROXY (contournement du refus des IP de datacenter) =========\\
// WhatsApp rejette les connexions venant de certaines plages IP d'hébergeurs :
// la socket est fermée avec le code 405 dès le handshake, session valide ou non.
// Renseigner PROXY_URL fait passer Baileys par un proxy.
//   http://user:pass@host:port     |     socks5://user:pass@host:port
// Variable absente = connexion directe, comportement inchangé.
global.waProxy = (function () {
    const url = process.env.PROXY_URL;
    if (!url) return null;
    try {
        const Agent = /^socks/i.test(url)
            ? require("socks-proxy-agent").SocksProxyAgent
            : require("https-proxy-agent").HttpsProxyAgent;
        const agent = new Agent(url);
        console.log(chalk.cyan("→ Proxy actif : " + url.replace(/\/\/[^@]*@/, "//***@")));
        return { agent: agent, fetchAgent: agent };
    } catch (e) {
        console.log(chalk.red("✖ Proxy inutilisable (" + e.message + ") — connexion directe."));
        return null;
    }
})();

//========= RESTAURATION DE LA SESSION =========\\
// SESSION_ID accepte deux formats :
//   1. PATRON-MD~<base64 du creds.json>  -> restauré ici, hors ligne, sans dépendance externe
//   2. PATRON-MD~<id de gist>            -> ancien comportement, main.js télécharge le gist
// Généré par : node pair.js <ton numéro>
const path = require("path");

;(function restoreSession() {
    try {
        const raw = global.session;
        if (!raw || !/^PATRON-MD~/.test(raw)) return;

        const sessionDir = path.join(__dirname, "tmp", "session");
        const credsFile = path.join(sessionDir, "creds.json");

        // Une session déjà présente sur le disque a toujours la priorité.
        if (fs.existsSync(credsFile)) return;

        const payload = raw.replace(/^PATRON-MD~/, "").trim();

        // Un id de gist fait 32 caractères hexadécimaux : on laisse main.js le télécharger.
        if (/^[0-9a-f]{32}$/i.test(payload)) return;

        let decoded;
        try {
            decoded = Buffer.from(payload, "base64").toString("utf8");
        } catch (e) {
            return;
        }

        let creds;
        try {
            creds = JSON.parse(decoded);
        } catch (e) {
            console.log(chalk.red("✖ SESSION_ID illisible : ce n'est pas un creds.json valide en base64."));
            return;
        }

        if (!creds || !creds.noiseKey || !creds.me) {
            console.log(chalk.red("✖ SESSION_ID incomplet : régénère-le avec `node pair.js <numéro>`."));
            return;
        }

        fs.mkdirSync(sessionDir, { recursive: true });
        fs.writeFileSync(credsFile, JSON.stringify(creds, null, 2));
        console.log(chalk.green("✔ Session restaurée depuis SESSION_ID (" + (creds.me.id || "").split(":")[0] + ")"));
    } catch (e) {
        console.log(chalk.red("✖ Restauration de la session impossible : " + (e && e.message)));
    }
})();

//==========================
