#!/usr/bin/env node
/**
 * One-shot local bootstrap: .env, Postgres, migrations, seed.
 * Does not install deps or start the app (pnpm install / pnpm dev stay separate).
 */
import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as sleep } from 'node:timers/promises'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(root)

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

function capture(command, args) {
  return spawnSync(command, args, { encoding: 'utf8' })
}

function requireDocker() {
  const version = capture('docker', ['compose', 'version'])
  if (version.error?.code === 'ENOENT') {
    console.error(
      'Docker is not installed (or not on PATH).\n' +
        'Install Docker Engine + Compose, then re-run: pnpm setup',
    )
    process.exit(1)
  }
  if (version.status !== 0) {
    const detail = (version.stderr || version.stdout || '').trim()
    console.error(
      'Docker Compose is unavailable.\n' +
        (detail || 'Install Docker Engine + Compose, then re-run: pnpm setup'),
    )
    process.exit(1)
  }

  const info = capture('docker', ['info'])
  if (info.status !== 0) {
    console.error(
      'Docker is installed but the daemon is not running.\n' +
        'Start Docker, then re-run: pnpm setup',
    )
    process.exit(1)
  }
}

async function waitForPostgresHealthy(timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const ps = capture('docker', ['compose', 'ps', '-q', 'postgres'])
    const id = (ps.stdout || '').trim()
    if (id) {
      const inspect = capture('docker', [
        'inspect',
        '--format',
        '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}',
        id,
      ])
      if ((inspect.stdout || '').trim() === 'healthy') {
        return
      }
    }
    await sleep(1000)
  }
  console.error('Postgres did not become healthy in time. Is Docker running?')
  process.exit(1)
}

async function main() {
  requireDocker()

  const envPath = join(root, '.env')
  const examplePath = join(root, '.env.example')

  if (!existsSync(envPath)) {
    if (!existsSync(examplePath)) {
      console.error('Missing .env.example')
      process.exit(1)
    }
    copyFileSync(examplePath, envPath)
    console.log('Created .env from .env.example')
  } else {
    console.log('.env already present — leaving it unchanged')
  }

  console.log('Starting Postgres…')
  run('docker', ['compose', 'up', '-d'])

  console.log('Waiting for Postgres health…')
  await waitForPostgresHealthy()

  console.log('Running migrations…')
  run('pnpm', ['db:migrate'])

  console.log('Seeding demo users…')
  run('pnpm', ['db:seed'])

  console.log('\nSetup complete. Start the apps with: pnpm dev')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
