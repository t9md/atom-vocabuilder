'use babel'

const {Range, Point, CompositeDisposable, BufferedProcess} = require('atom')

let shell, seleniumProxy

const PORT = 9999

module.exports = {
  activate() {
    const me = this
    this.disposable = new CompositeDisposable(
      atom.commands.add('atom-text-editor:not([mini])', {
        'vocabuilder:toggle'() {
          me.toggleLearnVocabularyMode()
        },
      })
    )
  },

  startServer() {
    const webdriver = require('selenium-webdriver')
    const net = require('net')

    const driver = new webdriver.Builder().forBrowser('chrome').build()
    seleniumProxy = net.createServer(function(socket) {
      socket.on('data', data => {
        driver.get('https://www.google.com/search?tbm=isch&q=' + data)
        socket.destroy()
      })
    })
    seleniumProxy.listen(PORT, 'localhost')
  },

  stopServer() {
    if (seleniumProxy) {
      seleniumProxy.destroy()
      seleniumProxy.close(() => {
        server.unref()
      })
      seleniumProxy = null
    }
    if (driver) {
      driver.destroy()
      driver = null
    }
  },

  toggleLearnVocabularyMode() {
    const editor = atom.workspace.getActiveTextEditor()
    editor.element.classList.toggle('learn-vocabulary-mode')

    let disposable = editor.onDidChangeCursorPosition(({oldBufferPosition, newBufferPosition}) => {
      if (oldBufferPosition.row !== newBufferPosition.row) {
        const text = this.getHeadWordAtPosition(editor, [newBufferPosition.row, 0])
        this.search(text)
      }
    })

    if (editor.element.classList.contains('learn-vocabulary-mode')) {
      if (!seleniumProxy) {
        this.startServer()
      }
    } else {
      disposable.dispose()
      disposable = null
      this.stopServer()
    }
  },

  deactivate() {
    this.disposable.dispose()
  },

  getHeadWordAtPosition(editor, point) {
    const regex = editor.getLastCursor().wordRegExp()
    point = Point.fromObject(point)
    const scanRange = new Range([point.row, 0], [point.row, Infinity])
    const ranges = editor.buffer.findAllInRangeSync(regex, scanRange)
    const range = ranges.find(range => range.end.column >= point.column && range.start.column <= point.column)
    const wordRange = range ? Range.fromObject(range) : new Range(point, point)
    return editor.getTextInBufferRange(wordRange)
  },

  search(text) {
    if (!shell) shell = require('electron').shell

    if (atom.config.get('vocabuilder.useDictLink')) {
      shell.openExternal('dict://' + text, {activate: false})
    }
    if (atom.config.get('vocabuilder.useSay')) {
      new BufferedProcess({
        command: 'say',
        args: ['-v', 'Samantha', `'${text}'`],
      })
    }
    if (atom.config.get('vocabuilder.useGoogle')) {
      new Client().send(text)
    }
  },

  consumeVimModePlus(service) {
    const pkg = this
    class VocabuilderMoveDown extends service.getClass('MoveDown') {
      static commandPrefix = 'vim-mode-plus-user'

      moveCursor(cursor) {
        super.moveCursor(cursor)
        // const text = pkg.getHeadWordAtPosition(this.editor, [cursor.getBufferRow(), 0])
        // console.log(text)
        // pkg.search(text)
      }
    }
    class VocabuilderMoveUp extends VocabuilderMoveDown {
      direction = 'up'
    }
    VocabuilderMoveDown.registerCommand()
    VocabuilderMoveUp.registerCommand()
  },
}

class Client {
  constructor() {
    const net = require('net')
    this.client = new net.createConnection({
      host: 'localhost',
      port: PORT,
    })
    this.client.setTimeout(100000)
    this.client.setEncoding('utf8')
  }

  send(msg) {
    console.log(`send: ${msg}`)
    this.client.write(msg)
  }

  close() {
    this.client.destroy()
  }
}
