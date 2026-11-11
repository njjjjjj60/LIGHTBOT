import { smsg } from "./lib/simple.js";
import { format } from "util";
import { fileURLToPath } from "url";
import path, { join } from "path";
import fs from "fs";
import chalk from "chalk";
import fetch from "node-fetch";
import ws from "ws";
import {
    bareNumber,
    matchesNumberList,
    findParticipant as findParticipantIn,
    rememberParticipants,
    rememberPair,
    getDirectoryEntry
} from "./lib/identity.js";

const { proto } = (await import("@whiskeysockets/baileys")).default;
const isNumber = x => typeof x === "number" && !isNaN(x);
const delay = ms => isNumber(ms) && new Promise(resolve => setTimeout(resolve, ms));
const escapeRegex = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const prefixCache = new Map();

const lidCache = new Map();
const jidCache = new Map();


const MISS_TTL = 60 * 1000;
const missCache = new Map();
const isMissed = key => {
    const t = missCache.get(key);
    if (!t) return false;
    if (Date.now() - t > MISS_TTL) {
        missCache.delete(key);
        return false;
    }
    return true;
};

async function getLidFromJid(id, conn) {
    if (!id) return id;
    if (id.endsWith("@lid")) return id;
    if (id.endsWith("@g.us")) return id;
    if (lidCache.has(id)) return lidCache.get(id);

    const known = getDirectoryEntry(id);
    const fromDir = [known?.lid, known?.id].find(x => typeof x === "string" && x.endsWith("@lid"));
    if (fromDir) {
        lidCache.set(id, fromDir);
        jidCache.set(fromDir, id);
        return fromDir;
    }

    if (isMissed("l:" + id)) return id;

    const res = await conn.onWhatsApp(id).catch(() => []);
    const lid = res?.[0]?.lid;
    if (lid && lid !== id) {
        lidCache.set(id, lid);
        jidCache.set(lid, id);
        return lid;
    }
    missCache.set("l:" + id, Date.now());
    return id;
}

async function getJidFromLid(id, conn) {
    if (!id) return id;
    if (!id.endsWith("@lid")) return id;
    if (jidCache.has(id)) return jidCache.get(id);

    const known = getDirectoryEntry(id);
    const fromDir = [known?.phoneNumber, known?.jid, known?.id].find(
        x => typeof x === "string" && x.endsWith("@s.whatsapp.net")
    );
    if (fromDir) {
        jidCache.set(id, fromDir);
        lidCache.set(fromDir, id);
        return fromDir;
    }

    if (isMissed("j:" + id)) return id;

    const res = await conn.onWhatsApp(id).catch(() => []);
    const jid = res?.[0]?.jid;
    if (jid && jid !== id) {
        jidCache.set(id, jid);
        lidCache.set(jid, id);
        return jid;
    }
    missCache.set("j:" + id, Date.now());
    return id;
}

export async function handler(chatUpdate) {
    const opts = global.opts || {};
    this.msgqueque = this.msgqueque || [];
    this.uptime = this.uptime || Date.now();
    if (!chatUpdate) return;
    this.pushMessage(chatUpdate.messages).catch(console.error);
    let m = chatUpdate.messages[chatUpdate.messages.length - 1];
    if (!m) return;

    try {
        await this.readMessages([m.key]);
    } catch (e) {}

    if (global.db.data == null) await global.loadDatabase();
    m = smsg(this, m) || m;
    if (!m) return;

    let prefixRegex = global.prefix;
    let usedPrefix = global.prefix || "";
    const senderNumber = bareNumber(this.user.jid);
    if (!prefixCache.has(senderNumber)) {
        const botPath = path.join('./Sessions/SubBot', senderNumber);
        const configPath = path.join(botPath, 'config.json');
        try {
            if (fs.existsSync(configPath)) {
                const config = JSON.parse(fs.readFileSync(configPath));
                if (config.prefix) {
                    prefixRegex = config.prefix === 'multi'
                        ? /^[#$@*&?,;:+×!_\-.]/
                        : new RegExp(`^(${[...config.prefix].map(c => escapeRegex(c)).join('|')})`);
                    prefixCache.set(senderNumber, prefixRegex);
                }
            }
        } catch (e) {
            console.error('🍁 خطأ في تحميل بادئة الروبوت الفرعي:', e);
        }
    } else {
        prefixRegex = prefixCache.get(senderNumber) || global.prefix;
    }

    m.exp = 0;
    m.coin = false;

    const botJid = this.user.jid;
    const botLid = await getLidFromJid(this.user.jid, this);

    
    let groupMetadata = {};
    let participants = [];
    if (m.isGroup) {
        groupMetadata = (await this.groupMetadata(m.chat).catch(() => null)) || { participants: [] };
        participants = groupMetadata.participants || [];
        rememberParticipants(participants);
    }

    
    const altIds = !m.fromMe
        ? [m.key?.participantAlt, m.key?.remoteJidAlt, m.key?.senderPn, m.key?.participantPn]
              .filter(x => typeof x === "string")
        : [];
    for (const alt of altIds) {
        if (m.sender?.endsWith("@lid") && alt.endsWith("@s.whatsapp.net")) rememberPair(m.sender, alt);
        else if (m.sender?.endsWith("@s.whatsapp.net") && alt.endsWith("@lid")) rememberPair(alt, m.sender);
    }

    const senderIsLid = m.sender?.endsWith("@lid");
    const senderJid = senderIsLid ? await getJidFromLid(m.sender, this) : m.sender;
    const senderLid = senderIsLid ? m.sender : await getLidFromJid(m.sender, this);

    const userGroup =
        findParticipantIn(participants, senderJid) ||
        findParticipantIn(participants, senderLid) ||
        findParticipantIn(participants, m.sender) ||
        {};

    const botGroup =
        findParticipantIn(participants, botJid) ||
        findParticipantIn(participants, botLid) ||
        findParticipantIn(participants, this.user.jid) ||
        {};

    const botJids = [this.user?.jid, botJid, botLid, (this.user?.jid || '').split(':')[0] + '@s.whatsapp.net'].filter(Boolean);
    const mentionedList = Array.isArray(m.mentionedJid) ? m.mentionedJid : [];
    const isMentioned = botJids.some(jid => {
        const cleanNumber = jid.split('@')[0].split(':')[0];
        return mentionedList.some(mJid => mJid?.includes(cleanNumber)) ||
               (m.text && m.text.includes('@' + cleanNumber)) ||
              (m.quoted && typeof m.quoted.sender === 'string' && m.quoted.sender.includes(cleanNumber));
    });

    if (isMentioned) {
        try {
            await this.sendPresenceUpdate('composing', m.chat);
            setTimeout(async () => {
                try { await this.sendPresenceUpdate('paused', m.chat); } catch {}
            }, 3000);
        } catch (e) {}
    }

    const dbKey = senderJid || m.sender;

    const user = global.db.data.users[dbKey] || (global.db.data.users[dbKey] = {
        name: m.name,
        exp: 0,
        coin: 0,
        bank: 0,
        level: 0,
        health: 100,
        genre: "",
        birth: "",
        marry: "",
        description: "",
        packstickers: null,
        premium: false,
        premiumTime: 0,
        banned: false,
        bannedReason: "",
        commands: 0,
        afk: -1,
        afkReason: "",
        warn: 0
    });

    const chat = global.db.data.chats[m.chat] || (global.db.data.chats[m.chat] = {
        isBanned: false,
        welcome: true,
        sWelcome: "",
        sBye: "",
        detect: true,
        primaryBot: null,
        modoadmin: false,
        antiLink: true,
        nsfw: false,
        economy: true,
        gacha: true
    });

    if (chat.isBanned) {
        const textLower = m.text?.toLowerCase() || '';
        if (
            !textLower.startsWith('.unbanchat') &&
            !textLower.startsWith('/unbanchat') &&
            !textLower.startsWith('!unbanchat') &&
            !textLower.startsWith('.desbanearbot') &&
            !textLower.startsWith('/desbanearbot') &&
            !textLower.startsWith('!desbanearbot')
        ) {
            return;
        }
    }

    const settings = global.db.data.settings[this.user.jid] || (global.db.data.settings[this.user.jid] = {
        self: false,
        restrict: true,
        jadibotmd: true,
        antiPrivate: false,
        gponly: false
    });

    if (typeof m.text !== "string") m.text = "";

    const nuevoNombre = m.pushName || await this.getName(dbKey);
    if (typeof nuevoNombre === "string" && nuevoNombre.trim() && nuevoNombre !== user.name) {
        user.name = nuevoNombre;
    }

    const conn = m.conn || global.conn;

    
    const senderIds = [
        senderJid,
        senderLid,
        m.sender,
        userGroup.id,
        userGroup.jid,
        userGroup.lid,
        userGroup.phoneNumber,
        ...altIds
    ].filter(Boolean);

    const isROwner = matchesNumberList(global.owner, ...senderIds);
    const isOwner = isROwner || m.fromMe;
    const isMods = isROwner || matchesNumberList(global.mods, ...senderIds);
    const isPrems = isROwner || matchesNumberList(global.prems, ...senderIds) || user.premium;

    if (settings.antiPrivate && !m.isGroup && !isOwner && !isMods) return;

    if (opts["nyimak"]) return;
    if (!m.fromMe && !isMods && settings.self) return;
    if (!m.fromMe && !isMods && settings.gponly && !m.chat.endsWith("g.us") && !/code|p|ping|qr|estado|status|infobot|botinfo|report|reportar|invite|join|logout|suggest|help|menu/gim.test(m.text)) return;
    if (opts["swonly"] && m.chat !== "status@broadcast") return;
    if (m.isBaileys) return;

    if (chat.primaryBot && chat.primaryBot !== this.user.jid && !m.text.startsWith((prefixRegex.source || '.') + 'delprimary')) {
        const primaryBotInGroup = participants.some(p => p.jid === chat.primaryBot || p.id === chat.primaryBot);
        const primaryBotConn = (global.conns || []).find(c => c.user.jid === chat.primaryBot && c.ws.socket?.readyState !== ws.CLOSED);
        if (primaryBotConn && primaryBotInGroup) return;
        chat.primaryBot = null;
    }

    if (opts["queque"] && m.text && !(isMods || isPrems)) {
        this.msgqueque.push(m.id || m.key.id);
        await delay(1000 * 5);
        const quequeIndex = this.msgqueque.indexOf(m.id || m.key.id);
        if (quequeIndex !== -1) this.msgqueque.splice(quequeIndex, 1);
    }

    m.exp += Math.ceil(Math.random() * 10);

    const isRAdmin = userGroup.admin === "superadmin";
    const isAdmin = isRAdmin || userGroup.admin === "admin";
    const isBotAdmin = botGroup.admin === "admin" || botGroup.admin === "superadmin";

    const ___dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), "./plugins");
    const __dirname = ___dirname;

    for (const name in global.plugins) {
        const plugin = global.plugins[name];
        if (!plugin || plugin.disabled) continue;

        const pluginPrefix = plugin.customPrefix || prefixRegex || conn.prefix || global.prefix;
        const match = (pluginPrefix instanceof RegExp
            ? [[pluginPrefix.exec(m.text), pluginPrefix]]
            : Array.isArray(pluginPrefix)
            ? pluginPrefix.map(p => [(p instanceof RegExp ? p : new RegExp(escapeRegex(p))).exec(m.text), p])
            : typeof pluginPrefix === "string"
            ? [[new RegExp(escapeRegex(pluginPrefix)).exec(m.text), new RegExp(escapeRegex(pluginPrefix))]]
            : [[[], new RegExp]]).find(p => p[1]);

        if (typeof plugin.all === "function") {
            await plugin.all.call(this, m, { chatUpdate, __dirname, __filename: join(___dirname, name), user, chat, settings });
        }

        if (!opts["restrict"] && plugin.tags?.includes("admin")) continue;

        if (typeof plugin.before === "function") {
            if (await plugin.before.call(this, m, {
                match,
                conn: this,
                participants,
                groupMetadata,
                user: userGroup,
                bot: botGroup,
                isROwner,
                isOwner,
                isMods,
                isRAdmin,
                isAdmin,
                isBotAdmin,
                isPrems,
                chatUpdate,
                __dirname,
                __filename: join(___dirname, name),
                chat,
                settings
            })) continue;
        }

        usedPrefix = (match[0] || "")[0];
        if (!usedPrefix) continue;

        const noPrefix = m.text.replace(usedPrefix, "");
        let [command, ...args] = noPrefix.trim().split(" ").filter(v => v);
        args = args || [];
        const text = args.join(" ");
        command = (command || "").toLowerCase();
        const isAccept = plugin.command instanceof RegExp
            ? plugin.command.test(command)
            : Array.isArray(plugin.command)
            ? plugin.command.some(cmd => cmd instanceof RegExp ? cmd.test(command) : cmd === command)
            : typeof plugin.command === "string"
            ? plugin.command === command
            : false;

        if (!isAccept) continue;

        try {
            await this.sendPresenceUpdate('composing', m.chat);
            setTimeout(async () => {
                try { await this.sendPresenceUpdate('paused', m.chat); } catch {}
            }, 3000);
        } catch (e) {}

        global.comando = command;

        if (chat.isBanned && !isMods && name !== "group-banchat.js") {
            if (!chat.primaryBot || chat.primaryBot === this.user.jid) {
                await this.reply(m.chat, `ꕥ البوت *${settings.botname || global.botname}* مُعطّل في هذه المجموعة\n\n> ✦ يمكن لـ *أحد المشرفين* تفعيله باستخدام الأمر:\n> » *${usedPrefix}bot on*`, m);
                return;
            }
        }

        if (user.banned && !isMods && m.text) {
            if (!chat.primaryBot || chat.primaryBot === this.user.jid) {
                await this.reply(m.chat, `ꕥ أنت محظور، لا يمكنك استخدام الأوامر في هذا البوت!\n\n> ● *السبب ›* ${user.bannedReason}\n\n> ● إذا كان هذا البوت حسابًا رسميًا ولديك دليل يثبت أن هذه الرسالة بالخطأ، يمكنك عرض حالتك على أحد المشرفين.`, m);
                return;
            }
        }

        if (chat.modoadmin && !isOwner && m.isGroup && !isAdmin && (plugin.botAdmin || plugin.admin || plugin.group)) return;

        if (plugin.rowner && !isROwner) {
            global.dfail("rowner", m, this);
            continue;
        }
        if (plugin.owner && !isOwner) {
            global.dfail("owner", m, this);
            continue;
        }
        if (plugin.mods && !isMods) {
            global.dfail("mods", m, this);
            continue;
        }
        if (plugin.premium && !isPrems) {
            global.dfail("premium", m, this);
            continue;
        }
        if (plugin.group && !m.isGroup) {
            global.dfail("group", m, this);
            continue;
        }

        if (plugin.admin && !isAdmin) {
            global.dfail("admin", m, this);
            continue;
        }

        if (plugin.botAdmin && !isBotAdmin) {
            global.dfail("botAdmin", m, this);
            continue;
        }
        if (plugin.private && m.isGroup) {
            global.dfail("private", m, this);
            continue;
        }

        if (plugin.coin && isNumber(plugin.coin) && plugin.coin > 0) {
            if (user.coin < plugin.coin) {
                await this.reply(m.chat, `ꕥ لا تملك عددًا كافيًا من *${global.currency}* لاستخدام هذا الأمر. تحتاج إلى ${plugin.coin} *${global.currency}*، لكن لديك ${user.coin} *${global.currency}*.`, m);
                continue;
            }
            user.coin -= plugin.coin;
            await this.reply(m.chat, `> ꕥ سيتم خصم ${plugin.coin} *${global.currency}* لاستخدام الأمر *${usedPrefix}${command}*.\n> » *_الرصيد الحالي: ${user.coin} ${global.currency}._*`, m);
        }

        m.isCommand = true;
        m.exp += plugin.exp ? parseInt(plugin.exp) : 10;

        try {
            await plugin.call(this, m, {
                match,
                usedPrefix,
                noPrefix,
                args,
                command,
                text,
                conn: this,
                participants,
                groupMetadata,
                user: userGroup,
                bot: botGroup,
                isROwner,
                isOwner,
                isMods,
                isRAdmin,
                isAdmin,
                isBotAdmin,
                isPrems,
                chatUpdate,
                __dirname,
                __filename: join(___dirname, name),
                chat,
                settings
            });

            if (typeof plugin.after === "function") {
                await plugin.after.call(this, m, {
                    match,
                    usedPrefix,
                    noPrefix,
                    args,
                    command,
                    text,
                    conn: this,
                    participants,
                    groupMetadata,
                    user: userGroup,
                    bot: botGroup,
                    isROwner,
                    isOwner,
                    isMods,
                    isRAdmin,
                    isAdmin,
                    isBotAdmin,
                    isPrems,
                    chatUpdate,
                    __dirname,
                    __filename: join(___dirname, name),
                    chat,
                    settings
                });
            }

            if (isAccept) user.commands = (user.commands || 0) + 1;
        } catch (err) {
            m.error = err;
            console.error(err);
        }
    }

    if (dbKey && user) user.exp += m.exp;
    if (!opts["noprint"]) await (await import("./lib/print.js")).default(m, this).catch(err => console.warn(err));
}

global.dfail = (type, m, conn) => {
    const msg = {
        rowner: `> 〄 الأمر *${global.comando}* يمكن استخدامه فقط من قِبل مالكي البوت.`,
        owner: `> 〄 الأمر *${global.comando}* يمكن استخدامه فقط من قِبل مطوري البوت.`,
        mods: `> 〄 الأمر *${global.comando}* يمكن استخدامه فقط من قِبل مشرفي البوت.`,
        premium: `> 〄 الأمر *${global.comando}* يمكن استخدامه فقط من قِبل المستخدمين المميزين.`,
        group: `> 〄 الأمر *${global.comando}* يمكن استخدامه فقط داخل المجموعات.`,
        private: `> 〄 الأمر *${global.comando}* يمكن استخدامه فقط في الخاص مع البوت.`,
        admin: `> 〄 الأمر *${global.comando}* يمكن استخدامه فقط من قِبل مشرفي المجموعة.`,
        botAdmin: `> 〄 لتنفيذ الأمر *${global.comando}* يجب أن أكون مشرفًا في المجموعة.`,
        restrict: `> 〄 هذه الميزة معطلة حالياً.`
    }[type];
    if (msg) return conn.reply(m.chat, msg, m).then(() => m.react('✖️'));
};