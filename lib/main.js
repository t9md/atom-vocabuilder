'use babel'

const {Range, Point, CompositeDisposable, BufferedProcess} = require('atom')

let shell, seleniumProxy

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
          me.manualSearch(this.getModel())
        }
      })
    )
  },

  deactivate () {
    this.disposable.dispose()
    this.subscriptionByEditor.forEach(disposable => disposable.dispose())
  },

  manualSearch (editor) {
    const point = [editor.getLastCursor().getBufferRow(), 0]
    const text = this.getHeadWordAtPosition(editor, point)
    this.search(text)
  },

  toggleAutoSearch () {
    const editor = atom.workspace.getActiveTextEditor()
    if (this.subscriptionByEditor.has(editor)) {
      this.subscriptionByEditor.get(editor).dispose()
      return
    }

    const disposable = editor.onDidChangeCursorPosition(({oldBufferPosition, newBufferPosition}) => {
      if (oldBufferPosition.row !== newBufferPosition.row) {
        const text = this.getHeadWordAtPosition(editor, [newBufferPosition.row, 0])
        this.search(text)
      }
    })
    this.subscriptionByEditor.set(editor, disposable)
  },

  getHeadWordAtPosition (editor, point) {
    const regex = editor.getLastCursor().wordRegExp()
    point = Point.fromObject(point)
    const scanRange = new Range([point.row, 0], [point.row, Infinity])
    const ranges = editor.buffer.findAllInRangeSync(regex, scanRange)
    const range = ranges.find(range => range.end.column >= point.column && range.start.column <= point.column)
    const wordRange = range ? Range.fromObject(range) : new Range(point, point)
    return editor.getTextInBufferRange(wordRange)
  },

  search (text) {
    if (!shell) shell = require('electron').shell

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

class Server {
  start () {
    const webdriver = require('selenium-webdriver')
    this.driver = new webdriver.Builder().forBrowser('chrome').build()

    const net = require('net')
    this.server = net.createServer(socket => {
      socket.on('data', data => {
        this.driver.get('https://www.google.com/search?tbm=isch&q=' + data)
        socket.destroy()
      })
    })
    this.server.listen(PORT, 'localhost')
  }

  stop () {
    this.server.close(() => {
      server.unref()
    })
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
    console.log(`send: ${msg}`)
    this.client.write(msg)
  }

  close () {
    this.client.destroy()
  }
}
