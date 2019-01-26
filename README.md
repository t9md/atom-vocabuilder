## What's this?

Use Atom editor as frontend to nourish your vocabularies.  
As you move cursor in buffer, it search on system's dictionary, Google Image, and pronounce it with `say` command.  

![vocabuilder](https://raw.githubusercontent.com/t9md/t9md/488d41c8262ab120bfaaba41bd103234752e2023/img/atom-vocabuilder.gif)

## Quick Tour

Assume you open following text in Atom.

```
abate	和らぐ、治まる
abdicate	放棄する
abdominal	腹部の
abhor	ひどく嫌う
abhorrent	大嫌いな、憎むべき
abject	惨めな
```

Then you invoke `vocabuilder:toggle-auto-search`.  
From now, each time you move cursor on this editor, vocabuilder automatically search `head-word` in different ap  
What is `head-word`? It's very first word on current line.  
So, when your cursor is first line, `head-word` is `abate`.  
Because search is done for `head-word`, you can place cursor loosely.  

Let me explain what actually happen when you click 3rd line, it's `head-word` is `abdominal`.
Vocabuilder searches `abdominal` in following apps.

- open Dictionary.app open and search.
- Launch Google Chrome and each word by "Google Image": Require manual install [WebDriver for Chrome](http://chromedriver.chromium.org/downloads).
- Let mac speak word by `say` command.

Each action can be disabled one by one on setting-view.

### NOTE for Google Image search

Vocabuilder use selenium to programmatically control Chrome Web browser.  
So if you want use Google Image search by Chrome browser, you need to install  [WebDriver for Chrome](http://chromedriver.chromium.org/downloads) manually.  
Download and extract and copy it to in your PATH.  


### Keymap

- for normal user
```
'atom-text-editor.vocabuilder':
  'ctrl-t': 'vocabuilder:toggle-caption'
  'ctrl-1': 'vocabuilder:caption-toggle-1st-field'
  'ctrl-2': 'vocabuilder:caption-toggle-2st-field'
  'ctrl-0': 'vocabuilder:caption-show-all-fields'
```

- for vim-mode-plus user
```
'atom-text-editor.vocabuilder.vim-mode-plus:not(.insert-mode)':
  ';': 'vocabuilder:toggle-caption'
  '1': 'vocabuilder:caption-toggle-1st-field'
  '2': 'vocabuilder:caption-toggle-2st-field'
  '0': 'vocabuilder:caption-show-all-fields'
```

### Development status

Alpha
