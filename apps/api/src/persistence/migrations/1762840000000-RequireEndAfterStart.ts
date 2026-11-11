import type { MigrationInterface, QueryRunner } from 'typeorm'

/** The end date must be after the start date. Same-day rows cannot remain. */
export class RequireEndAfterStart1762840000000 implements MigrationInterface {
  name = 'RequireEndAfterStart1762840000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM vacation_requests
      WHERE start_date = end_date
    `)
    await queryRunner.query(`
      ALTER TABLE vacation_requests
      DROP CONSTRAINT vacation_requests_dates_check
    `)
    await queryRunner.query(`
      ALTER TABLE vacation_requests
      ADD CONSTRAINT vacation_requests_dates_check
      CHECK (end_date > start_date)
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE vacation_requests
      DROP CONSTRAINT vacation_requests_dates_check
    `)
    await queryRunner.query(`
      ALTER TABLE vacation_requests
      ADD CONSTRAINT vacation_requests_dates_check
      CHECK (end_date >= start_date)
    `)
  }
}
