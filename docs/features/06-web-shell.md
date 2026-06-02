# F6 — Web shell: public dashboard, auth, my catalog, settings

**Ветка:** `feature/web-shell`

## Scope
Каркас фронтенда (public-first) согласно [05-frontend.md §2,§3,§4a](../05-frontend.md).

- `apiClient` (fetch с `credentials: 'include'`, обработка ошибок), `queryClient`.
- Роутинг: `/` (публичный дашборд), `/play/:id` (заглушка/базовый плеер под F8), `/login`,
  `/my`, `/grids/:id` (заглушка под F7), `/settings`, `/profile`; `ProtectedRoute` только
  для приватных маршрутов.
- **Auth (аддитивная)**: `useAuth` (`GET /auth/me` → `user|null`, logout); TopBar
  показывает «Войти» или меню профиля; LoginPage — Google + dev-login форма; Vite proxy
  на api для same-site cookie.
- **Public dashboard** (`/`): `usePublicGrids` — список+поиск публичных сеток
  (`PublicGridCard`, `SearchBar`); кнопки «играть» (→`/play/:id`), `LikeButton`,
  `CopyToMineButton`; для гостя персональные действия → `SignInPrompt`.
- **My catalog** (`/my`, auth): `useMyGrids` — свои сетки, создать (диалог + RHF/Zod),
  удалить; навигация в редактор.
- **Settings** (`/settings`, auth): `useSettings` — форма (BPM, клик strong/weak,
  громкость, count-in), PATCH. **Гость**: `useLocalSettingsStore` (localStorage) +
  `useEffectiveSettings`; перенос локальных в профиль при входе.
- **Likes/Copy**: `useLikes`, `useCopyToMine` (optimistic).
- AppShell, TopBar, dark theme, базовая адаптивность.

## Зависимости
F4, F5 (auth + public/own grids + likes + settings API), F0 (web-скелет, UI-kit).

## Контракты
Эндпоинты — [04-api.md](../04-api.md); DTO/схемы из `@jazz/shared`; структура/доступ —
[05-frontend.md](../05-frontend.md).

## Тесты
- Vitest + Testing Library: ProtectedRoute (гость → редирект на `/login`), публичный
  дашборд рендерится **без** auth, LikeButton/CopyToMine для гостя → SignInPrompt,
  SettingsForm (валидация), useLocalSettingsStore/useEffectiveSettings (выбор источника).
- Мокаются сетевые запросы (MSW или мок apiClient).

## Definition of Done
- Гость открывает `/` (публичный каталог) без логина; поиск работает.
- Логин (dev) → `/my` (создание/удаление сетки) → settings (сервер) работают.
- Гостевые настройки в localStorage; перенос при входе. Тесты зелёные.
