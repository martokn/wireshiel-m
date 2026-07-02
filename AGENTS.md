# AGENTS.md

## Project Context

This is a NetShield network security app repository. Treat it as user-owned application code, keep changes focused on the user's request, and preserve existing project conventions.

Start with `README.md` for local setup and development workflow.

## Key Files

- `src/`: frontend application source.
- `src/api/netshieldClient.js`: API client with localStorage-backed data persistence.
- `vite.config.js`: Vite configuration.

## Working Notes

- Use `npm run dev` for development.
- Run the relevant checks from `package.json` before finishing code changes.
- Data is persisted in localStorage — clearing browser storage will reset demo data.
