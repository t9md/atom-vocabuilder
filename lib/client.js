const PORT = 9999
const net = require('net')

class Client {
  constructor () {
    this.client = new net.createConnection({
      host: 'localhost',
      port: PORT
    })
    this.client.setTimeout(100000)
    this.client.setEncoding('utf8')
  }

  send (msg) {
    this.client.write(msg)
  }

  destroy () {
    this.client.destroy()
  }
}

module.exports = Client
