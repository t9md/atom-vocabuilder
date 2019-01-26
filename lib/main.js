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
          me.searchForRow(editor, editor.getCursorBufferPosition.row)
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
        const Server = require('./server')
        this.server = new Server()
        this.server.start()
      }
      const Client = require('./client')
      new Client().send(text)
    }
  }
}
