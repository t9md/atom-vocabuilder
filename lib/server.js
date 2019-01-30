'use babel'

const PORT = 9999
const webdriver = require('selenium-webdriver')
const net = require('net')

function getConfig (param) {
  return atom.config.get('vocabuilder.' + param)
}

function browserToggleCaption () {
  const element = document.getElementById('vocabuilder-caption')
  if (element) {
    element.style.display = element.style.display !== 'none' ? 'none' : ''
  }
}

function browserToggleImageVisibility (state) {
  const element = document.getElementById('res')
  if (element) {
    element.style.visibility = state ? '' : 'hidden'
  }
}

function browserInjectStyle (css) {
  const element = document.createElement('style')
  document.body.appendChild(element)
  element.innerHTML = css
}

function browserGetHiddenFieldElements () {
  const captionContainer = document.getElementById('vocabuilder-caption')
  if (!captionContainer) {
    return []
  } else {
    const children = captionContainer.children
    const elements = []
    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      if (child.style.visibility === 'hidden') {
        elements.push(child)
      }
    }
    return elements
  }
}

function browserUpdateCaptionFieldVisibility (hideIndexes = []) {
  const captionContainer = document.getElementById('vocabuilder-caption')
  if (!captionContainer) return
  const children = captionContainer.children
  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    child.style.visibility = hideIndexes.includes(i) ? 'hidden' : ''
  }
}

function browserShowCaption (hideIndexes, fields) {
  const oldContainer = document.getElementById('vocabuilder-caption')
  if (oldContainer) oldContainer.remove()

  const container = document.createElement('div')

  container.onclick = event => {
    container.style.display = 'none'
  }

  container.id = 'vocabuilder-caption'
  let index = 0
  for (const field of fields) {
    const div = document.createElement('div')
    div.id = `vocabuilder-caption-item-${index + 1}`
    const tt = document.createElement('tt')
    tt.innerText = field
    div.appendChild(tt)
    container.appendChild(div)
    if (hideIndexes.includes(index)) {
      div.style.visibility = 'hidden'
    }
    index++
  }

  document.body.appendChild(container)
}

class Server {
  constructor () {
    this.defaultHideField = {}
    this.showImage = true
  }

  getHideIndexes () {
    return Object.keys(this.defaultHideField).map(n => Number(n))
  }

  toggleImageVisibility () {
    this.showImage = !this.showImage
    this.updateImageVisibility()
  }

  async updateImageVisibility () {
    await this.driver.executeScript(browserToggleImageVisibility, this.showImage)
  }

  async startDriver () {
    this.driver = new webdriver.Builder().forBrowser('chrome').build()
  }

  restartDriver () {
    if (this.driver) {
      this.driver.quit()
    }
    this.startDriver()
  }

  async listen () {
    this.server = net.createServer(socket => {
      socket.on('data', async data => {
        const fields = ('' + data).split(/\t/)
        const headWord = fields[0]
        await this.driver.get('https://www.google.com/search?tbm=isch&q=' + headWord)
        await this.updateImageVisibility()
        await this.driver.executeScript("document.getElementById('res').scrollIntoView()")
        if (atom.config.get('vocabuilder.showCaption')) {
          await this.driver.executeScript(browserInjectStyle, getConfig('userStyle'))
          await this.driver.executeScript(browserShowCaption, this.getHideIndexes(), fields)
        }
        socket.destroy()
      })
    })
    this.server.listen(PORT, 'localhost')
  }

  toggleCaption () {
    this.driver.executeScript(browserToggleCaption)
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

  async captionShowAllFieldsOrMoveDown (editor) {
    if (await this.driver.executeScript("return document.getElementById('res').style.visibility === 'hidden'")) {
      this.driver.executeScript(browserToggleImageVisibility, true)
      return
    }

    const elements = await this.driver.executeScript(browserGetHiddenFieldElements)
    if (elements.length > 0) {
      this.updateCaptionFieldVisibility([])
    } else {
      editor.moveDown()
    }
  }

  stop () {
    this.server.close(() => server.unref())
    this.driver.quit()
  }
}

module.exports = Server
