## 0.6.0
- [New] `fieldReplaceWithNewLineRegex` config control which patter to be replaced with `\n` within field.
- [Fix] `say` command now correctly say only for head word. It was inadvertently pronounced whole line.
## 0.5.0
- [New] Allow Show/hide image. Please note, slight delay or flash before hidden is inevitable.
- [Improve] Auto search when current while line text was deleted and next line come under cursor.
- [Improve] Restart webdriver(browser) if necessary.
- [New] User can now modify own caption style.
- [New] Add command to quickly toggle `useSay`, `useDictLink`, and `useGoogle` setting.

## 0.4.0
- [New] New command `vocabuilder:caption-show-all-fields-or-move-down` does what you mean.
  - When you hide 2nd field, hitting this command show let all hidden field show, then `move-down` for next execution.
## 0.3.0
- [New] Now support show/hide 1st and 2nd field of caption.
  - This mean, you can use vocabuilder as quick quiz app for vocabularies.
- [Breaking] Changed `vocabuilder:toggle-caption` to `vocabuilder:caption-toggle` for consistency to other commands.
## 0.2.0
- [Improve] Auto scroll to head of images collection section for google image result.
- [NEW] show caption over google images
  - `showCaption` config globally control this feat. deafult enabled.
  - `vocabuilder:toggle-caption` command to quickly show/hide current caption.
## 0.1.0
- Initial Release
