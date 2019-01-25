'use babel'

const {CompositeDisposable, BufferedProcess} = require('atom')

let shell, seleniumProxy

const PORT = 9999
// let

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

    if (editor.element.classList.contains('learn-vocabulary-mode')) {
      if (!seleniumProxy) {
        this.startServer()
      }
    } else {
      this.stopServer()
    }
  },

  deactivate() {
    this.disposable.dispose()
  },

  consumeVimModePlus(service) {
    class VocabuilderMoveDown extends service.getClass('MoveDown') {
      static commandPrefix = 'vim-mode-plus-user'
      moveCursor(cursor) {
        super.moveCursor(cursor)

        if (!shell) {
          shell = require('electron').shell
        }
        const range = this.utils.getWordBufferRangeAtBufferPosition(
          this.editor,
          [cursor.getBufferRow(), 0],
          cursor.wordRegExp()
        )
        const text = this.editor.getTextInBufferRange(range)

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
