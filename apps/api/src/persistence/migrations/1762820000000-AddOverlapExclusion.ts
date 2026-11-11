import type { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Phase C hardening: prevent overlapping pending/approved ranges at the DB level.
 */
export class AddOverlapExclusion1762820000000 implements MigrationInterface {
  name = 'AddOverlapExclusion1762820000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS btree_gist`)
    await queryRunner.query(`
      ALTER TABLE vacation_requests
      ADD CONSTRAINT vacation_requests_no_overlap
      EXCLUDE USING gist (
        user_id WITH =,
        daterange(start_date, end_date, '[]') WITH &&
      )
      WHERE (status IN ('pending', 'approved'))
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE vacation_requests
      DROP CONSTRAINT IF EXISTS vacation_requests_no_overlap
    `)
  }
}
