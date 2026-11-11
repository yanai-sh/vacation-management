import type { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Foundation migration only. Domain entities (users, vacation requests, etc.)
 * will be introduced in later implementation exercises.
 */
export class InitialFoundation1762800000000 implements MigrationInterface {
  name = 'InitialFoundation1762800000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS foundation_meta (
        id integer PRIMARY KEY,
        initialized_at timestamptz NOT NULL DEFAULT now()
      )
    `)

    await queryRunner.query(`
      INSERT INTO foundation_meta (id)
      VALUES (1)
      ON CONFLICT (id) DO NOTHING
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS foundation_meta`)
  }
}
