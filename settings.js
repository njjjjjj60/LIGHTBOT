import { watchFile, unwatchFile } from "fs"
import chalk from "chalk"
import { fileURLToPath } from "url"
import fs from "fs"

global.botNumber = "" 


// خليته يقدر يدعم رقم و lid في نفس الوقت
global.owner = [
["5512981547738", "© ＷＩＬＬＩＡＭ", true, "219984634589433@lid"],
    
["", "© SHANKS", true, "129673887498432@lid"],
    
["", "© 7arb", true, "219984634589433@lid"],
    
]


global.mods = []
global.suittag = ["5512981547738"] // حط رقمك
global.prems = []


global.libreria = "Baileys Multi Device"
global.vs = "^1.3.2"
global.nameqr = "𝑸𝑹"
global.sessions = "Sessions/Principal"
global.jadi = "Sessions/SubBot"
global.MichiJadibts = true

global.botname = "◜Ｎｏｘ┊🌓┊Ｂｏｔ◞"
global.textbot = "Ｎｏｘ Ｂｏｔ"
global.dev = "© 𝚆𝙸𝙻𝙻𝙸𝙰𝙼 𝚇 𝚂𝙷𝙰𝙽𝙺𝚂"
global.author = "© mᥲძᥱ ᑲᥡ 𝚆𝙸𝙻𝙻𝙸𝙰𝙼 𝚇 𝚂𝙷𝙰𝙽𝙺𝚂"
global.etiqueta = "i aM Shanks"
global.currency = "عمله"
global.michipg = "https://files.catbox.moe/xm4gan.jpg"
global.icono = "https://files.catbox.moe/bocvdr.jpg"
global.catalogo = fs.readFileSync('./lib/catalogo.jpg')


global.group = "https://whatsapp.com/channel/0029VbC5LLx6GcGDXZUmHP0y"
global.community = "https://whatsapp.com/channel/0029VbCeOCi7tkjC9bGs3U0l"
global.channel = "https://whatsapp.com/channel/0029VbC5LLx6GcGDXZUmHP0y"
global.github = "https://github.com/SHANKS-CODE-1/CODE"
global.gmail = "minexdt@gmail.com"
global.ch = {
ch1: "120363426042842162@newsletter",
ch2: "120363405714949121@newsletter"
}


global.APIs = {
vreden: { url: "https://api.vreden.web.id", key: null },
delirius: { url: "https://api.delirius.store", key: null },
zenzxz: { url: "https://api.zenzxz.my.id", key: null },
siputzx: { url: "https://api.siputzx.my.id", key: null },
adonix: { url: "https://api-adonix.ultraplus.click", key: null }
}


let file = fileURLToPath(import.meta.url)
watchFile(file, () => {
unwatchFile(file)
console.log(chalk.redBright("Update 'settings.js'"))
import(`${file}?update=${Date.now()}`)
})