'use babel'

const PORT = 9999
const webdriver = require('selenium-webdriver')
const net = require('net')
const fs = require('fs')
const path = require('path')
const PLACE_HOLDER_HTML_PATH = __dirname + '/placeholder.html'

function getConfig (param) {
  return atom.config.get('vocabuilder.' + param)
}

function browserToggleCaption (state) {
  const element = document.getElementById('vocabuilder-caption')
  if (element) {
    let newValue
    if (state != null) {
      newValue = state ? '' : 'none'
    } else {
      newValue = element.style.display !== 'none' ? 'none' : ''
    }
    element.style.display = newValue
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

function browserShowCaption ({hideIndexes, fields, showCaption}) {
  const oldContainer = document.getElementById('vocabuilder-caption')
  if (oldContainer) oldContainer.remove()

  const container = document.createElement('div')
  container.style.display = showCaption ? '' : 'none'

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

function browserUpdateCaption ({hideIndexes, fields, showCaption}) {
  const captionContainer = document.getElementById('vocabuilder-caption')
  captionContainer.style.display = showCaption ? '' : 'none'

  const tts = captionContainer.getElementsByTagName('tt')
  let index = 0
  for (const tt of tts) {
    tt.innerText = fields[index]
    tt.parentElement.style.visibility = hideIndexes.includes(index) ? 'hidden' : ''
    index++
  }
}

function browserLoadSnapshotImage ({showImage, snapshotFilePath}) {
  document.getElementById('vocabuilder-snapshot').src = snapshotFilePath
  const element = document.getElementById('res')
  if (element) {
    element.style.visibility = showImage ? '' : 'hidden'
  }
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

  async forceRefresh () {
    this.searchForFields(this.currentFields, true)
  }

  async searchForFields (fields, dontUseCache = false) {
    const headWord = fields[0]
    this.currentFields = fields

    const snapshotFilePath = this.getSnapshotFilePath(headWord)

    const options = {
      hideIndexes: this.getHideIndexes(),
      fields: fields,
      showImage: this.showImage,
      snapshotFilePath: snapshotFilePath,
      showCaption: getConfig('showCaption')
    }

    if (!dontUseCache && getConfig('useSnapshot') && fs.existsSync(snapshotFilePath)) {
      const title = await this.driver.getTitle()
      if (title === 'Vocabuilder Shapshot Page') {
        await this.driver.executeScript(browserLoadSnapshotImage, options)
        await this.driver.executeScript(browserUpdateCaption, options)
      } else {
        await this.driver.get('file://' + PLACE_HOLDER_HTML_PATH)
        await this.driver.executeScript(browserInjectStyle, getConfig('userStyle'))
        await this.driver.executeScript(browserLoadSnapshotImage, options)
        await this.driver.executeScript(browserShowCaption, options)
      }
    } else {
      await this.driver.get('https://www.google.com/search?gl=us&hl=en&pws=0&gws_rd=cr&tbm=isch&q=' + headWord)
      await this.driver.executeScript(browserInjectStyle, getConfig('userStyle'))
      await this.updateImageVisibility()
      await this.driver.executeScript("document.getElementById('res').scrollIntoView()")
      if (getConfig('takeSnapshot')) {
        await this.driver
          .manage()
          .window()
          .maximize()
        await this.takeSnapshot(headWord)
      }
      await this.driver.executeScript(browserShowCaption, options)
    }
  }

  async listen () {
    this.server = net.createServer(socket => {
      socket.on('data', async data => {
        const regex = new RegExp(getConfig('fieldReplaceWithNewLineRegex'), 'g')
        const fields = ('' + data).split(/\t/).map(e => e.replace(regex, '\n'))
        await this.searchForFields(fields)
      })
    })
    this.server.listen(PORT, 'localhost')
  }

  getSnapshotFilePath (word) {
    return path.join(getConfig('snapshotDirectory'), word + '.png')
  }

  async takeSnapshot (word) {
    // const data = await this.driver.findElement({id: 'res'}).takeScreenshot()
    const data = await this.driver.takeScreenshot()
    fs.writeFileSync(this.getSnapshotFilePath(word), data, 'base64')
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
    if (
      await this.driver.executeScript("return document.getElementById('vocabuilder-caption').style.display === 'none'")
    ) {
      this.driver.executeScript(browserToggleCaption, true)
      return
    }

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
