export const theme = {
  skull: '❄️',
  blood: '⚔️',
  virus: '🗡️',
  eye: '🔮',
  sword: '🩸',
  target: '✧',
  darkStar: '𓉘᳟ี ⃞̸͢𑁃 ̚𓉝᳟ี',
  lightStar: '❄️ּ۪᪲۫ᮬ',
  divider: '𓉘᳟ี ⃞̸͢𑁃 ̚𓉝᳟ี ͟͟͞͞┄꯭๋━┄꫶︦┄꯭๋━┄꫶︦┄꯭๋━┄꫶︦━┄꫶︦┄꯭๋━┄꯭๋━┄꫶︦┤',
  smallDivider: '❄️ ═══════════════ ❄️',
  endDivider: '𓉘᳟ี ⃞̸͢𑁃 ̚𓉝᳟ี ͟͟͞͞┄꯭๋━┄꫶︦┄',
  title: (text) => `❄️ *${text}*`,
  subtitle: (text) => `⚔️ *${text}*`,
  info: (text) => `🔮 *${text}*`,
  warning: (text) => `⚠️ *${text}* ⚠️`,
  success: (text) => `✅ *${text}*`,
  error: (text) => `❌ *${text}*`,
  build: (sections) => {
    let msg = `${theme.divider}\n`
    for (const section of sections) {
      if (section.type === 'title') {
        msg += `│\n│ ❄️ *${section.text}*\n`
      } else if (section.type === 'subtitle') {
        msg += `│ ⚔️ *${section.text}*\n`
      } else if (section.type === 'info') {
        msg += `│ 🔮 ${section.label}: ${section.value}\n`
      } else if (section.type === 'line') {
        msg += `│ ${section.text}\n`
      } else if (section.type === 'divider') {
        msg += `│\n│ ${theme.smallDivider}\n`
      } else if (section.type === 'spacer') {
        msg += `│\n`
      }
    }
    msg += `│\n${theme.endDivider}`
    return msg
  },
  profile: (data) => {
    let msg = `❀⃘⃛͜ ۪۪۪݃𓉘᳟ี ⃞̸͢𑁃 ̚𓉝᳟ี ͟͟͞͞⌒᳝︵໋۪۪۪۪۪᳝֔࣪┄꯭๋━┄꫶︦⡳۪۪۪۪۟︵໋۪۪۪۪۪᳝֔࣪⌒᳝ᦷ࣭࣪❄️ּ۪᪲۫ᮬ ࣭࣪ᦡ ۪ׄ⌒᳝
   ⃝⃘︢︣֟፝ · ͟͟͞͞𝙎𝙃𝘼𝙉𝙆𝙎· ͟͟͞͞➳ 𝙱𝚘𝚝
${theme.divider}
`
    for (const item of data) {
      if (item.type === 'header') {
        msg += `├ׁ̟̇˚₊· ͟͟͞͞➳❥ ${item.text}\n`
      } else if (item.type === 'info') {
        msg += `├ׁ̟̇˚₊· ͟͟͞͞➳❥ ${item.label}: ${item.value}\n`
      } else if (item.type === 'line') {
        msg += `├ׁ̟̇˚₊· ͟͟͞͞➳❥ ${item.text}\n`
      }
    }
    msg += `${theme.endDivider}`
    return msg
  }
}

export const formatWithTheme = (data) => {
  return theme.build(data)
}