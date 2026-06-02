# 05 — Структура frontend

## Цель документа

Описать структуру `apps/web`: роутинг, разделение состояния (Zustand vs TanStack Query),
компонентное дерево, кастомный CSS Grid компонент гармонической сетки, мост к
`music-core` и адаптивность. Стек: React + Vite + TS, shadcn/ui + Tailwind + Radix,
Zustand + TanStack Query, RHF + Zod, dnd-kit, Lucide. Тема — dark-first.

---

## 1. Структура каталогов

```
apps/web/src/
  main.tsx                  # bootstrap: QueryClientProvider, router, theme
  App.tsx                   # layout + маршруты
  routes/
    PublicDashboardPage.tsx # `/` публичный каталог (список/поиск) + кнопка «плеер»
    PlayerPage.tsx          # `/play` плеер по публичным сеткам с навигацией между ними
    LoginPage.tsx
    MyGridsPage.tsx         # `/my` свой каталог (требует auth)
    EditorPage.tsx          # harmony editor / trainer (требует auth)
    SettingsPage.tsx        # `/settings` (требует auth)
    ProfilePage.tsx         # `/profile` (требует auth)
  components/
    ui/                     # shadcn/ui примитивы (button, dialog, input, ...)
    layout/                 # AppShell, TopBar, ProtectedRoute
    grid/                   # HarmonyGrid (CSS Grid), BarCell, ChordChip
    transport/              # TransportBar, BeatIndicator, BpmControl, TimeSigSelect, KeySelect
    editor/                 # BarEditor, DslPanel, GeneratorPanel
    catalog/                # PublicGridCard (+ LikeButton, CopyToMineButton), SearchBar
    dashboard/              # MyGridCard, CreateGridDialog
    settings/               # SettingsForm, ClickSettings
    auth/                   # SignInPrompt (CTA для гостя: «войти, чтобы …»)
  stores/
    usePlaybackStore.ts     # Zustand: проекция playback-state-machine
    useEditorStore.ts       # Zustand: выбранный такт, локальные правки, dirty-флаг
    useLocalSettingsStore.ts# Zustand+persist(localStorage): настройки метронома гостя
  queries/
    usePublicGrids.ts       # публичный каталог: список/поиск (без auth)
    usePublicGrid.ts        # одна публичная сетка
    useMyGrids.ts           # свой каталог + CRUD (auth)
    useGrid.ts              # одна своя сетка
    useSettings.ts          # серверные настройки пользователя (auth)
    useAuth.ts              # /auth/me (возвращает user|null), logout
    useLikes.ts             # like/unlike публичной сетки (auth)
    useCopyToMine.ts        # copy публичной/своей сетки себе (auth)
    usePatterns.ts          # паттерны + generate-мутация (без auth)
  engine/
    useTransport.ts         # мост React ↔ music-core TransportEngine/Metronome
    audioContext.ts         # старт AudioContext по жесту
  lib/
    apiClient.ts            # fetch-обёртка (credentials, ошибки)
    queryClient.ts
  theme/                    # tailwind theme tokens, dark
```

Импорты музыкальной логики — только из `@jazz/music-core` и `@jazz/shared`. Никакой
музыкальной логики в компонентах.

---

## 2. Роутинг (public-first)

| Путь | Страница | Доступ |
|---|---|---|
| `/` | PublicDashboardPage — публичный каталог (список/поиск сеток) | **публичный** |
| `/play` / `/play/:id` | PlayerPage — плеер по публичным сеткам + навигация между ними | **публичный** |
| `/login` | LoginPage | публичный |
| `/my` | MyGridsPage — свой каталог | требует auth |
| `/grids/:id` | EditorPage (editor/trainer своей сетки) | требует auth |
| `/settings` | SettingsPage | требует auth |
| `/profile` | ProfilePage | требует auth |

- Приложение открывается **без логина**: `/` показывает публичный каталог; из карточки
  можно открыть сетку в **плеере** (`/play/:id`) с метрономом и навигацией «пред./след.
  сетка». В плеере гость может менять BPM/клик/размер/тональность (локально, §4a).
- `ProtectedRoute` оборачивает только приватные маршруты: проверяет `useAuth`
  (`user !== null`); гость → редирект на `/login` с `returnTo`.
- `useAuth` опрашивает `GET /auth/me` (возвращает `user|null`); по нему TopBar показывает
  либо «Войти», либо профиль/меню. Персональные действия (лайк, «скопировать себе»,
  «редактировать», «сохранить настройки») для гостя ведут к `SignInPrompt`.
- LoginPage — кнопка «Войти через Google» и (в dev-режиме) форма dev-login.

---

## 3. Разделение состояния

### Серверное состояние → TanStack Query
Всё, что приходит с API: публичный каталог, свой каталог, текущая сетка, серверные
настройки, паттерны, лайки, текущий пользователь (`user|null`). Кэширование, инвалидция
после мутаций, optimistic update (сохранение сетки, лайк).

### Клиентское состояние → Zustand
- **`usePlaybackStore`** — проекция `PlaybackStateMachine` из `music-core`:
  `status` (idle/playing/paused), `currentBar`, `currentBeat`, `selectedBar`.
  Обновляется tick-событиями транспорта; компоненты подписаны и перерисовываются.
- **`useEditorStore`** — состояние редактирования: выбранный такт, буфер правок,
  `isDirty`. Сохранение синхронизирует с сервером через мутацию TanStack Query.
- **`useLocalSettingsStore`** (Zustand + `persist` в localStorage) — настройки метронома
  гостя: bpm, clickStrong/Weak, volume, countIn. Переживают перезагрузку.

Принцип: серверные данные не дублируются в Zustand; Zustand — эфемерное UI/playback
состояние + локальные настройки гостя.

### Разрешение настроек метронома (гость vs пользователь)
Хук `useEffectiveSettings()` возвращает актуальные настройки:
- **гость** (`user === null`) → из `useLocalSettingsStore`;
- **авторизован** → из `useSettings` (сервер); изменения пишутся `PATCH /settings`.

При первом входе, если в localStorage есть настройки гостя, фронт один раз предлагает
перенести их в профиль (`PATCH /settings`), затем переключается на серверные.

---

## 4. Мост к music-core (`engine/useTransport.ts`)

```
useTransport():
  - лениво создаёт TransportEngine + MetronomeInstrument (music-core, Tone.js)
  - применяет bpm/clickSettings из useEffectiveSettings (гость→localStorage, иначе сервер)
  - применяет timeSignature/key из playbackOverride (если есть) или из текущей сетки
  - подписывает PlaybackStateMachine на tick-события → пишет в usePlaybackStore
  - возвращает команды: play(), pause(), stop(), nextBar(), prevBar(), selectBar(n)
  - старт AudioContext при первом play (жест пользователя)
```

Компоненты transport-бара вызывают эти команды и читают позицию из `usePlaybackStore`.
Звук планируется в аудиодвижке; React только отражает позицию — тайминг не зависит от рендера.

---

## 4a. Публичный каталог, плеер и локальный override

### PublicDashboardPage (`/`)
- Список публичных сеток (`usePublicGrids`) карточками `PublicGridCard`: название,
  размер, тональность, `likeCount`, `LikeButton`, `CopyToMineButton`, кнопка «играть».
- `SearchBar` — поиск по названию/тональности (`?q=`), сортировка (по дате/лайкам/имени).
- Действия `LikeButton`/`CopyToMineButton` для гостя → `SignInPrompt` (CTA войти).
- Кнопка «Открыть плеер» ведёт на `/play`.

### PlayerPage (`/play/:id`)
- Загружает публичную сетку (`usePublicGrid`), показывает `HarmonyGrid` (read-only) +
  `TransportBar`. Навигация «пред./след. сетка» переключает `:id` в пределах каталога.
- **Локальный override** (`playbackOverride` в локальном состоянии страницы/стора):
  гость/любой может менять для текущего прослушивания **размер (TimeSig), тональность
  (Key), BPM, клик** — это влияет только на плейбек, **не** сохраняется в публичную сетку.
- «Сохранить себе» = `CopyToMineButton` (создаёт `private`-копию через `useCopyToMine`,
  требует auth) — туда переносятся текущие параметры; затем доступно редактирование.

> Публичная сетка нередактируема. Любое «изменение» публичной сетки в UI — это либо
> локальный override плейбека, либо предложение скопировать её в свой каталог.

---

## 5. Компонент гармонической сетки (custom CSS Grid)

`components/grid/HarmonyGrid.tsx`:
- CSS Grid: такты как ячейки, перенос по строкам (напр. 4 такта в строке на desktop).
- Каждый такт (`BarCell`) визуально отделён рамкой; внутри — `ChordChip`(ы).
- Поддержка нескольких аккордов в такте (чипы делят ширину по `beats`).
- **Подсветка**: текущий такт во время playback (из `usePlaybackStore.currentBar`),
  выбранный такт (из `useEditorStore.selectedBar`) — разными стилями.
- Клик по такту → `selectBar(n)`.
- DnD (dnd-kit) — перестановка тактов/аккордов (минимально в MVP, расширяемо).
- Крупная рабочая область: на desktop сетка занимает основную часть экрана.

`BarEditor` — редактирование выбранного такта: добавить/удалить аккорд, ввести символ
(валидация через `music-core` парсер по месту), задать `beats`.

---

## 6. Панели редактора

- **TransportBar** (верх): Play/Pause/Stop/Prev/Next, BPM-контрол, TimeSig-селект (размер),
  KeySelect (тональность), настройки клика (быстрый доступ), `BeatIndicator` (текущий
  такт/доля). В редакторе своей сетки изменения пишутся в сетку; в плеере публичной —
  в локальный `playbackOverride` (см. §4a).
- **DslPanel**: textarea для импорта DSL и кнопка экспорта (показывает сериализованный
  DSL). Импорт парсит через `music-core`, ошибки подсвечиваются с позицией.
- **GeneratorPanel**: выбор паттерна, тональности, длины формы → `POST /generate` →
  предпросмотр → «применить в редактор».

---

## 7. Адаптивность

- **Desktop**: сетка — основная область; панели сбоку/сверху.
- **Tablet**: сетка сужается (меньше тактов в строке), панели сворачиваются в табы/аккордеон.
- **Mobile**: transport-бар закреплён снизу (sticky), сетка скроллится, редактирование
  такта — в bottom-sheet/диалоге. Не перегружать интерфейс.
- Tailwind breakpoints; компоненты адаптируют число колонок сетки.

---

## 8. Тема и UI

- Dark-first: токены темы в Tailwind; светлая тема — опционально позже.
- shadcn/ui компоненты поверх Radix; Lucide-иконки.
- Музыкальный, чистый, не перегруженный UI; акцентные цвета для текущего/выбранного такта.

---

## 9. Тестирование фронта

- Vitest + Testing Library: ключевые компоненты (HarmonyGrid подсветка, TransportBar
  команды, PublicGridCard + LikeButton/CopyToMine для гостя → SignInPrompt, формы
  настроек), сторы (playback projection, useLocalSettingsStore, useEffectiveSettings).
- Мок `music-core` транспорта и сети в компонентных тестах.
- e2e (Playwright) — сквозные сценарии (см. [07-features.md](07-features.md), F8):
  гость открывает `/` → плеер публичной сетки → метроном; авторизованный лайкает и
  копирует публичную сетку себе → редактирует.
