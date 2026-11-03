# Reference

Written by `packages/editor/src/reference.test.ts` from the code. Do not edit by hand.

Everything here is experimental until the packages leave `0.0.0` (see [VERSIONING](./VERSIONING.md)).

## Places of `overrides`

- `header`
- `headerActions`
- `field`
- `rail`
- `panelStart`
- `panelEnd`
- `quickActions`
- `contextMenu`

## Names for `hide`

### places

- `header`
- `rail`
- `panelStart`
- `panelEnd`
- `quickActions`
- `contextMenu`

### header

- `header.undo`
- `header.redo`
- `header.frame`
- `header.zoom`
- `header.save`
- `header.status`

### tool

- `tool.blocks`
- `tool.layers`
- `tool.images`
- `tool.themes`

### props

- `props.align`
- `props.anchors`
- `props.phone`

## Keys of `permissions`

- `canEdit`
- `canDelete`
- `canDuplicate`
- `canDrag`
- `canAdd`

## Commands (`run`)

- `history.undo`
- `history.redo`
- `block.duplicate`
- `block.delete`
- `block.group`
- `block.ungroup`
- `block.reorder`
- `view.zoom`
- `view.frame`
- `view.zoomTo`
- `selection.select`
- `selection.clear`
- `tool.pick`

## Limits

- Plugin API version: 1
- Longest array field: 100 items
- Deepest nesting of array and object fields: 3
