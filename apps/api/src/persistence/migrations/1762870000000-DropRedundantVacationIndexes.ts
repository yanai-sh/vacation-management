import type { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * (status, created_at) and (user_id, created_at) already cover equality on the
 * leading column, so the single-column copies only add write cost.
 */
export class DropRedundantVacationIndexes1762870000000 implements MigrationInterface {
  name = 'DropRedundantVacationIndexes1762870000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX vacation_requests_status_idx`)
    await queryRunner.query(`DROP INDEX vacation_requests_user_id_idx`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX vacation_requests_user_id_idx ON vacation_requests (user_id)
    `)
    await queryRunner.query(`
      CREATE INDEX vacation_requests_status_idx ON vacation_requests (status)
    `)
  }
}
