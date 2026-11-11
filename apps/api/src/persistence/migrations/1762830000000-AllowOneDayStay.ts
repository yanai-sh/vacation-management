import type { MigrationInterface, QueryRunner } from 'typeorm'

/** A one-day stay is a valid request: the last day may equal the first. */
export class AllowOneDayStay1762830000000 implements MigrationInterface {
  name = 'AllowOneDayStay1762830000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
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

  public async down(queryRunner: QueryRunner): Promise<void> {
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
}
