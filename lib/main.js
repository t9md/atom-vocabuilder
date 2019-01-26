'use babel'

const {Range, Point, CompositeDisposable, BufferedProcess} = require('atom')
const {shell} = require('electron')
const PORT = 9999

module.exports = {
  activate () {
    const me = this
    this.subscriptionByEditor = new Map()
    this.disposable = new CompositeDisposable(
      atom.commands.add('atom-text-editor:not([mini])', {
        'vocabuilder:toggle-auto-search' () {
          me.toggleAutoSearch()
        },
        'vocabuilder:manual-search' () {
          const editor = this.getModel()
          me.searchForRow(editor, editor.getCursorBufferPosition.row)
        },
        'vocabuilder:toggle-caption' () {
          me.server && me.server.toggleCaption()
        }
      })
    )
  },

  deactivate () {
    this.disposable.dispose()
    this.subscriptionByEditor.forEach((disposable, editor) => {
      editor.element.classList.remove('vocabuilder')
      disposable.dispose()
    })
  },

  toggleAutoSearch () {
    const editor = atom.workspace.getActiveTextEditor()
    if (this.subscriptionByEditor.has(editor)) {
      this.subscriptionByEditor.get(editor).dispose()
      return
    }

    editor.element.classList.add('vocabuilder')
    let timeoutId
    const disposable = editor.onDidChangeCursorPosition(event => {
      const {textChanged, oldBufferPosition, newBufferPosition, cursor} = event
      if (textChanged) return
      if (!cursor.selection.isEmpty()) return

      if (oldBufferPosition.row !== newBufferPosition.row) {
        if (timeoutId) clearTimeout(timeoutId)

        timeoutId = timeoutId = setTimeout(() => {
          this.searchForRow(editor, newBufferPosition.row)
          timeoutId = null
        }, 300)
      }
    })
    this.subscriptionByEditor.set(editor, disposable)
  },

  searchForRow (editor, row) {
    this.search(editor.lineTextForBufferRow(row))
  },

  search (text) {
    if (atom.config.get('vocabuilder.useDictLink')) {
      shell.openExternal('dict://' + text, {activate: false})
    }
    if (atom.config.get('vocabuilder.useSay')) {
      new BufferedProcess({command: 'say', args: ['-v', 'Samantha', `'${text}'`]})
    }

    if (atom.config.get('vocabuilder.useGoogle')) {
      if (!this.server) {
        this.server = new Server()
        this.server.start()
      }
      new Client().send(text)
    }
  }
}

function toggleCaption () {
  const element = document.getElementById('vocabuilder-caption')
  if (element) {
    element.style.display = element.style.display !== 'none' ? 'none' : ''
  }
}

function showCaption (...fields) {
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
  start () {
    const webdriver = require('selenium-webdriver')
    const net = require('net')

    this.driver = new webdriver.Builder().forBrowser('chrome').build()
    this.server = net.createServer(socket => {
      socket.on('data', data => {
        const fields = ('' + data).split(/\s+/)
        const headWord = fields[0]
        this.driver.get('https://www.google.com/search?tbm=isch&q=' + headWord).then(() => {
          this.driver.executeScript("document.getElementById('res').scrollIntoView()")
          if (atom.config.get('vocabuilder.showCaption')) {
            this.driver.executeScript(showCaption, ...fields)
          }
        })
        socket.destroy()
      })
    })
    this.server.listen(PORT, 'localhost')
  }

  toggleCaption () {
    if (this.driver) {
      this.driver.executeScript(toggleCaption)
    }
  }

  stop () {
    this.server.close(() => {
      server.unref()
    })
    this.driver.quit()
    this.driver.destroy()
  }
}

class Client {
  constructor () {
    const net = require('net')
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

  close () {
    this.client.destroy()
  }
}
