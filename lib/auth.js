
const axios = require('axios')
const uuid = require('uuid/v1')

module.exports = {

  async login(email) {

    const nonce = uuid()

    await axios.get(`
      ${process.env.ADMIN_DOMAIN}/auth/magic/request?email=${email}&nonce=${nonce}
    `)

    return new Promise(res => {
        
      const poll = async () => {
        const { data: token } = await axios.get(`${process.env.ADMIN_DOMAIN}/auth/magic/poll?nonce=${nonce}`)
        if (token) {
          res(token)
        } else setTimeout(poll, 2000)
      }

      poll()
      
    })
  }
}
