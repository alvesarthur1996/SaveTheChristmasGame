# Persistence (scaffold)

This folder provides a storage abstraction so the game can run in different environments:

- **Dev (current):** HTTP driver talking to the local express server (`server/server.js`).
- **Production (planned):** Electron file driver (read/write JSON inside Electron `app.getPath('userData')`).

## Usage

Existing call sites should use the existing facade functions:

- `src/utils/gameState.ts`: `loadGameState()`, `saveGameState()`
- `src/utils/options.ts`: `loadOptions()`, `saveOptions()`

Those facades now delegate to `getPersistenceDriver()`.
