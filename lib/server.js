const PORT = 9999
const webdriver = require('selenium-webdriver')
const net = require('net')

function browserToggleCaption () {
  const element = document.getElementById('vocabuilder-caption')
  if (element) {
    element.style.display = element.style.display !== 'none' ? 'none' : ''
  }
}

function browserUpdateCaptionFieldVisibility (hideIndexes = []) {
  const captionContainer = document.getElementById('vocabuilder-caption')
  if (!captionContainer) return
  const children = captionContainer.children
  for (let i = 0; i < children.length; i++) {
    child = children[i]
    child.style.visibility = hideIndexes.includes(i) ? 'hidden' : ''
  }
}

function browserShowCaption (hideIndexes, fields) {
  const container = document.createElement('div')
  container.id = 'vocabuilder-caption'
  let index = 0
  for (const field of fields) {
    const div = document.createElement('div')
    const tt = document.createElement('tt')
    tt.innerText = field
    tt.style.fontSize = index > 0 ? '0.5em' : '1.0em'
    div.appendChild(tt)
    container.appendChild(div)
    if (hideIndexes.includes(index)) {
      div.style.visibility = 'hidden'
    }
    index++
  }

  Object.assign(container.style, {
    position: 'fixed',
    top: '30%',
    left: '5%',
    zIndex: '5',
    width: '80%',
    borderRadius: '30px',
    padding: '30px',
    color: 'white',
    backgroundColor: 'black',
    opacity: '0.6',
    fontSize: '120px',
    textAlign: 'center'
  })
  document.body.appendChild(container)
}

class Server {
  constructor () {
    this.defaultHideField = {}
  }

  getHideIndexes () {
    return Object.keys(this.defaultHideField).map(n => Number(n))
  }

  start () {
    this.driver = new webdriver.Builder().forBrowser('chrome').build()
    this.server = net.createServer(socket => {
      socket.on('data', data => {
        const fields = ('' + data).split(/\s+/)
        const headWord = fields[0]
        this.driver.get('https://www.google.com/search?tbm=isch&q=' + headWord).then(() => {
          this.driver.executeScript("document.getElementById('res').scrollIntoView()")
          if (atom.config.get('vocabuilder.showCaption')) {
            this.driver.executeScript(browserShowCaption, this.getHideIndexes(), fields)
          }
        })
        socket.destroy()
      })
    })
    this.server.listen(PORT, 'localhost')
  }

  toggleCaption () {
    if (this.driver) {
      this.driver.executeScript(browserToggleCaption)
    }
  }

  updateCaptionFieldVisibility (hideIndexes = this.getHideIndexes()) {
    this.driver.executeScript(browserUpdateCaptionFieldVisibility, hideIndexes)
  }

  toggleCaptionField (nth) {
    if (this.defaultHideField[nth]) {
      delete this.defaultHideField[nth]
    } else {
      this.defaultHideField[nth] = true
    }
    this.updateCaptionFieldVisibility()
  }

  stop () {
    this.server.close(() => {
      server.unref()
    })
    this.driver.quit()
    this.driver.destroy()
  }
}

module.exports = Server
