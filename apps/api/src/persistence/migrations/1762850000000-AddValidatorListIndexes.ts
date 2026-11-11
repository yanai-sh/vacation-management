import type { MigrationInterface, QueryRunner } from 'typeorm'

/** Validator list: filter status and/or user, order by created_at DESC, limit/offset. */
export class AddValidatorListIndexes1762850000000 implements MigrationInterface {
  name = 'AddValidatorListIndexes1762850000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX vacation_requests_status_created_at_idx
        ON vacation_requests (status, created_at DESC)
    `)
    await queryRunner.query(`
      CREATE INDEX vacation_requests_user_id_created_at_idx
        ON vacation_requests (user_id, created_at DESC)
    `)
    await queryRunner.query(`
      CREATE INDEX vacation_requests_created_at_idx
        ON vacation_requests (created_at DESC)
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX vacation_requests_created_at_idx`)
    await queryRunner.query(`DROP INDEX vacation_requests_user_id_created_at_idx`)
    await queryRunner.query(`DROP INDEX vacation_requests_status_created_at_idx`)
  }
}
