
const Netlify = require("netlify")

module.exports = (projectDir, config) => {

  let errors = []

  if (config.deploy.netlify) {

    if (!config.deploy.netlify.access_token) {
      errors.push(`Missing 'netlify.access_token'`)
    }

    if (!config.deploy.netlify.site_id) {
      errors.push(`Missing 'netlify.access_token'`)
    }

    if (!errors.length) {
      return Netlify.deploy({
        access_token: config.deploy.netlify.access_token,
        site_id: config.deploy.netlify.site_id,
        dir: `${projectDir}/output`
      }).catch(e => console.log('deploy e', e))
    } else {
      return errors
    }
  }
}
