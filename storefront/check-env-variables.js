const c = require("ansi-colors")

const DEFAULT_PUBLISHABLE_KEY =
  "pk_af1c9c73f3aa243796e175d5e7f8b11e263d4627024d732fa98641cd22d3b978"

function checkEnvVariables() {
  if (!process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY) {
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY = DEFAULT_PUBLISHABLE_KEY
    console.warn(
      c.yellow.bold(
        `\n⚠️ Notice: NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY not set in environment. Falling back to default AcademyIO key (${DEFAULT_PUBLISHABLE_KEY.substring(
          0,
          16
        )}...)\n`
      )
    )
  }
}

module.exports = checkEnvVariables

