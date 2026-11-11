# Vacation Management

Web app for employees to submit vacation requests and for managers (validators) to approve or reject them.

## Stack

| Layer | Choices |
| --- | --- |
| Frontend | Vue 3, Vue Router, Vuex 4, Axios, Tailwind CSS v4, Nuxt UI |
| Backend | Node.js, TypeScript, CommonEventFramework |
| Database | PostgreSQL 18 + TypeORM migrations |
| Tooling | pnpm workspaces, mise (Node 26 / pnpm 12), Docker Compose |

## Prerequisites

- [mise](https://mise.jdx.dev/) (installs Node 26 and pnpm 12 from `.mise.toml`)
- Docker Engine + Compose (daemon running)
