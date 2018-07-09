
const Netlify = require("netlify")

module.exports = (projectDir, config) => {
  console.log(projectDir, config)
  return Netlify.deploy({
    access_token: config.deploy.netlify.access_token,
    site_id: config.deploy.netlify.site_id,
    dir: `${projectDir}/output`
  }).catch(e => console.log('deploy e', e))
}
