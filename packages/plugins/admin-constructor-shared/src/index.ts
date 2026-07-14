/**
 * @jazz/plugin-admin-constructor-shared
 *
 * Единая база конструктора для ударных (unpitched) и мелодических (pitched)
 * инструментов. Содержит generic-компоненты (ConstructorPage, CellEditor,
 * OrganismViewer), grid-математику, clone-хелперы, autosave-store, контракты
 * стратегии и диалог создания элементов.
 *
 * Тонкие плагины (admin-drum-constructor, admin-piano-constructor) создают
 * `ConstructorStrategy` + `PreviewControls` и рендерят `ConstructorPage`.
 */

// grid math
export {
  PPQ,
  BEATS_PER_BAR,
  STYLES,
  STYLE_LABELS,
  subdivisionsPerBeat,
  ticksPerCol,
  colsPerBar,
  tickToCol,
  colToTick,
  colLabel,
  clamp01,
  type ConstructorStyle,
} from './gridMath.js';

// clone helpers
export { cloneMolecule, cloneCell, cloneOrganism } from './clone.js';

// types / contracts
export type {
  PreviewControls,
  PreviewPlayOptions,
  MoleculeEditorProps,
  CellEditorProps,
  OrganismViewerProps,
  CellValidationError,
  ConstructorStrategy,
} from './types.js';

// store
export { createConstructorStore, isStoreDirty, type ConstructorState, type ConstructorSnapshot } from './useConstructorStore.js';

// generic components
export { ConstructorPage } from './ConstructorPage.js';
export { CellEditor } from './CellEditor.js';
export { OrganismViewer, BAR_TICKS } from './OrganismViewer.js';
export { SaveIndicator } from './SaveIndicator.js';
export { CreateEntityDialog, CreateButton, type CreateEntityKind } from './CreateEntityDialog.js';
