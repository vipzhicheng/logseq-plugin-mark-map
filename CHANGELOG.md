# CHANGELOG

## 0.4.2

- fix: add 3 toolbar buttons
- fix: adjust save to svg
- fix: adjust save to png
- chore: refactor code
- feat: add blur switch setting

## 0.4.1

- feat: enable rendering images on markmap, and adjust render size.

## 0.4

- feat: make task tag clickable
- feat: support hierarchy and linked references
- fix: replace query syntax to indicator
- fix: replace table syntax to indicator

## 0.3.17

- feat: support disable shortcuts

## 0.3.16

- fix: allow empty block with children blocks exists.

## 0.3.15

- fix: style for `WAITING` task and `CANCELLED` task
- fix: clean logbook syntax

## 0.3.14

- fix: shortcut `b` not work
- fix: reset theme not correct

## 0.3.13

- infra: upgrade deps

## 0.3.12

- feat: add favoriates and recent to default markmap

## 0.3.11

- fix: footnote messed up markmap
- feat: node anchor icon changable

## 0.3.10

- feat: add pen mode icon.

## 0.3.9

- feat: add pen mode for presentation.

## 0.3.8

- fix: color freeze level default value.

## 0.3.7

- feat: support color freeze level feature.

## 0.3.6

- fix: continue to optimize code block render logic

## 0.3.5

- fix: continue to optimize code block render logic

## 0.3.4

- fix: code block render logic

## 0.3.3

- feat: add an option to replace complicated math expression for compatability.

## 0.3.2

- feat: add autofit option, default is enabled, but you can disable it now.

## 0.3.1

- fix: error when missing block happens.
- fix: only show first line on markmap.
- fix: expand shortcut can not show all nodes.

## 0.3.0

- feat: sync collapsed state to markmap.
- feat: support markdown quote syntax, `> `.
- feat: journal home page mark map.
- refactor: remove Alpine dependency.

## 0.2.13

- fix: support image popup for org format.
- fix: http image not popup.

## 0.2.12

- fix: node anchor back and forth not work on namespace page.
- fix: always show top right corner buttons.
- infra: upgrade deps.

## 0.2.11

- feat: support node anchor then you can pick any sub tree as the new markmap.

## 0.2.10

- infra: upgrade deps.
- fix: png not loading #25.
- fix: content is a little bit small in saved png #43.
- fix: can only render at most level 6 #44.

## 0.2.9

- infra: upgrade deps.
- feat: optimize for `{{cloze}}`.

## 0.2.8

- feat: add theme setting, so you can keep your favorite theme permanently.
- feat: add `ctrl+shift+m ctrl+shift+m` to trigger mindmap for all
- infra: upgrade deps.

## 0.2.7

- feat: change trigger icon.
- fix: zindex to over the system puzzle icon.

## 0.2.6

- feat: serve alpinejs locally.
- fix: `^^` highlight not supported.

## 0.2.5

- infra: upgrade deps.
- feat: set default theme according Logseq theme.

## 0.2.4

- infra: upgrade deps.
- feat: support Logseq hash syntax.

## 0.2.3

- fix: ref block cut issue.
- chore: refactor some code.

## 0.2.2

- feat: support auto wrap for long block.
- infra: upgrade deps.

## 0.2.1

- feat: ignore `---` lines.
- feat: replace renderer lines.

## 0.2.0

- feat: support export as svg.

## 0.1.9

- feat: support block background color on markmap.

## 0.1.8

- fix: pdf asset wrongly parsed as image on markmap.
- fix: optimize image parse, remove image properties.
- fix: can not load children blocks in recent Logseq release.
- infra: change from webpack to vite.
- infra: upgrade deps.

## 0.1.7

- fix: parse tag issue, should not parse url anchor.

## 0.1.6

- feat: support exporting high resolution png.

## 0.1.5

- fix: remove shortcut `m m` but keep `ctrl+m ctrl+m`.
- feat: make the shortcut configurable.

## 0.1.4

- feat: support open page or block markmap in markmap.
- feat: support trigger backward on markmap.
- feat: support block page markmap trigger by shortcut.
- feat: add `cmd+[` and `cmd+]` shortcuts on markmap to traverse.

## 0.1.3

- feat: `m m`, Trigger Markmap for non-editing mode.
- feat: `ctrl+m ctrl+m`, Trigger Markmap for editing mode.
- feat: `Markmap` slash command.
- feat: `Markmap` contextual menu.
- feat: Editing block or highlighting block will be the central node of the Markmap, otherwise it will use the whole page blocks.
- fix: Local images can not popup after changing graph.

## 0.1.2

- feat: Add a block property `mark-map-limit:: N` to limit block next level block list items.
- feat: Add a page property `mark-map-limit:: N` to limit first level block list items.
- feat: Add a page property `mark-map-limit-all:: N` to limit all block list items.
- feat: Support parse block ref link and page ref link, eg. `[]((()))` and `[]([[]])`

## 0.1.1

- feat: Add a close button on right top corner and hidden by default.
- feat: Add a block property `mark-map-cut:: 30` to cut text length.
- feat: Add page property `mark-map-collapsed:: extend` to show all nodes, and ignore collapsed state.
- feat: Make mindmap show collapsed state the same with Logseq by default.
- fix: Local image lightbox not work on Windows.

## 0.1.0

- feat: Custom center node by setting page property `mark-map-title:: blahblah`
- feat: Hide any collapsed node by setting page property `mark-map-collapsed:: hidden`
- feat: Hide any node by setting block property `mark-map-display:: hidden`
- feat: Support multiline text by leading `- `
- feat: Support images opened in a popup modal using Lightbox2.
- fix: Local image can not be opened.

## 0.0.10

- feat: Support highlight syntax, `==` in Markdown mode, `^^` in Org mode.
- feat: Support Logseq block reference. #5
- feat: Support Logseq embed block reference.
- feat: Support Logseq page reference.
- feat: Support Logseq embed page reference.
- feat: Support Logseq page tag
- feat: Colorize workflow tags.

## 0.0.9

- no new features or bug fixes, just fix meta data.

## 0.0.8

- fix: Org-mode, strikethrough(del) syntax not work, #3
- fix: Make all URLs in MindMap opened to system browser to prevent stuck in Logseq, #4
- fix: Latex syntax not rendered at first time.
- fix: Shortcut `r` conflicts with Logseq `cmd`+`r`.
- feat: Improve parsing links, now pure links with text can be parsed correctly.
- feat: Finally, image partly supported, and will be convert to image link.

## 0.0.7

- feat: Support org format in a non-perfect way.
- feat: Make pure url clickable on Markmap.
- fix: Code block render issue.

## 0.0.6

- feat: Add a help popup modal, press `/` to trigger.
- feat: Add more shortcuts to change theme, move mindmap up, down, left, right.
- fix: Wrong "save as png" file name sometimes.

## 0.0.5

- feat: Add up to 16 themes.
- feat: Change auto dark mode to follow Logseq theme.
- Fix: corner toolbar color change with theme changing.

## 0.0.4

- Filter out front matter block.
- Show Logseq block tag.
- Add blur background effect.
- Support auto dark mode based on system theme.

## 0.0.3

- Fix some level and page switch issues.
- Add more shortcuts include traversing step by step, level by level, focusing in and out.

## 0.0.2

- Add shortcuts support.
- Add `save as png` toolbar.
- Optimize performance.

## 0.0.1

- Basic integration with `Markmap`.
