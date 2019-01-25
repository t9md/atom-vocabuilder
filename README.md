## What's this?

When you enabled `vocabuilder:toggle` in certain type of text like blow.  

```
abate	和らぐ、治まる
abdicate	放棄する
abdominal	腹部の
abhor	ひどく嫌う
abhorrent	大嫌いな、憎むべき
abject	惨めな
```

Then as move up or down with `j`, `k`, head word(first column word) are handled by following actions.

- Dictionary.app open `word`
- Chrome search `word` by "Google Image": require [WebDriver for Chrome](http://chromedriver.chromium.org/downloads).
- `say` command pronounce `word` with Samantha's voice.

Each action can be disabled on setting-view.

### Keymap

```
'atom-text-editor.learn-vocabulary-mode.vim-mode-plus:not(.insert-mode)':
  'k': 'vim-mode-plus-user:vocabuilder-move-up'
  'j': 'vim-mode-plus-user:vocabuilder-move-down'
```

### Development status

Alpha
