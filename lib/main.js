'use babel'

const {Range, Point, CompositeDisposable, BufferedProcess} = require('atom')
const {shell} = require('electron')

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
        'vocabuilder:restart-driver' () {
          me.server && me.server.restartDriver()
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
    if (this.server) {
      this.server.stop()
    }
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

      timeoutId = setTimeout(() => {
        self.searchForRow(editor, row)
        timeoutId = null
      }, 300)
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

  search (text) {
    if (atom.config.get('vocabuilder.useDictLink')) {
      shell.openExternal('dict://' + text, {activate: false})
    }
    if (atom.config.get('vocabuilder.useSay')) {
      new BufferedProcess({command: 'say', args: ['-v', 'Samantha', `'${text}'`]})
    }

    if (atom.config.get('vocabuilder.useGoogle')) {
      if (!this.server) {
        const Server = require('./server')
        this.server = new Server()
        this.server.startDriver()
        this.server.listen()
      }
      const Client = require('./client')
      new Client().send(text)
    }
  }
}
