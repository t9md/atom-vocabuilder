'use babel'

const {Range, Point, CompositeDisposable, BufferedProcess} = require('atom')
const {shell} = require('electron')
const crypto = require('crypto')
const path = require('path')
const fs = require('fs')

const Server = require('./server')
const Client = require('./client')

function toggleConfig (param) {
  const paramFull = 'vocabuilder.' + param
  atom.config.set(paramFull, !atom.config.get(paramFull))
}

function getConfig (param) {
  const paramFull = 'vocabuilder.' + param
  return atom.config.get(paramFull)
}

function getRawFileForWord (word) {
  const voice = 'en-US-Wavenet-F'
  content = voice + word
  const hash = crypto
    .createHash('sha256')
    .update(content)
    .digest('hex')
  return hash + '.wav'
}

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
          me.searchForRow(editor, editor.getCursorBufferPosition().row)
        },
        'vocabuilder:caption-toggle' () {
          me.server && me.server.toggleCaption()
        },
        'vocabuilder:caption-toggle-1st-field' () {
          me.server && me.server.toggleCaptionField(0)
        },
        'vocabuilder:caption-toggle-2nd-field' () {
          me.server && me.server.toggleCaptionField(1)
        },
        'vocabuilder:caption-show-all-fields' () {
          me.server && me.server.updateCaptionFieldVisibility([])
        },
        'vocabuilder:caption-show-all-fields-or-move-down' () {
          me.server && me.server.captionShowAllFieldsOrMoveDown(this.getModel())
        },
        'vocabuilder:toggle-image-visibility' () {
          me.server && me.server.toggleImageVisibility()
        },
        'vocabuilder:toggle-use-dict-link' () {
          toggleConfig('useDictLink')
        },
        'vocabuilder:toggle-use-say' () {
          toggleConfig('useSay')
        },
        'vocabuilder:toggle-use-google' () {
          toggleConfig('useGoogle')
        },
        'vocabuilder:restart-driver' () {
          me.server && me.server.restartDriver()
        },
        'vocabuilder:force-refresh' () {
          me.server && me.server.forceRefresh()
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
    if (this.server) this.server.stop()
    if (this.client) this.client.destroy()
  },

  toggleAutoSearch () {
    const editor = atom.workspace.getActiveTextEditor()
    if (this.subscriptionByEditor.has(editor)) {
      this.subscriptionByEditor.get(editor).dispose()
      this.subscriptionByEditor.delete(editor)
      return
    }

    editor.element.classList.add('vocabuilder')
    let timeoutId

    const self = this
    function searchRow (editor, row) {
      if (timeoutId) clearTimeout(timeoutId)

      const duration = getConfig('autoSearchDebounceDuration')
      if (duration === 0) {
        self.searchForRow(editor, row)
      } else {
        timeoutId = setTimeout(() => {
          self.searchForRow(editor, row)
          timeoutId = null
        }, duration)
      }
    }

    const disposableForBuffer = editor.getBuffer().onDidChangeText(event => {
      const {oldRange, newRange} = event
      const isLinewiseRange = ({start, end}) => start.column === 0 && end.column === 0
      if (isLinewiseRange(oldRange) && isLinewiseRange(newRange)) {
        searchRow(editor, editor.getCursorBufferPosition().row)
      }
    })

    const disposable = editor.onDidChangeCursorPosition(event => {
      const {textChanged, oldBufferPosition, newBufferPosition, cursor} = event
      if (textChanged) return
      if (!cursor.selection.isEmpty()) return

      if (oldBufferPosition.row !== newBufferPosition.row) {
        searchRow(editor, newBufferPosition.row)
      }
    })

    this.subscriptionByEditor.set(editor, new CompositeDisposable(disposableForBuffer, disposable))
  },

  searchForRow (editor, row) {
    this.search(editor.lineTextForBufferRow(row))
  },

  async search (text) {
    const headWord = text.split(/\t/)[0]

    if (getConfig('useDictLink')) {
      shell.openExternal('dict://' + text, {activate: false})
    }
    if (getConfig('useSay')) {
      new BufferedProcess({command: 'say', args: ['-v', 'Samantha', `'${headWord}'`]})
    }
    if (getConfig('usePlayRaw')) {
      const dir = getConfig('rawDirectory')
      const rawFile = path.join(getConfig('rawDirectory'), getRawFileForWord(headWord))
      fs.access(rawFile, fs.constants.F_OK, err => {
        if (!err) {
          new BufferedProcess({command: 'play', args: [rawFile]})
        }
      })
    }

    if (getConfig('useGoogle')) {
      if (!this.server) {
        this.server = new Server()
        this.server.startDriver()
        this.server.listen()
      }

      try {
        await this.server.driver.getWindowHandle()
      } catch (e) {
        this.server.restartDriver()
      } finally {
        if (!this.client) {
          this.client = new Client()
        }
        this.client.send(text)
      }
    }
  }
}
