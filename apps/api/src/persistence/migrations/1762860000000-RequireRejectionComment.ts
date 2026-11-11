import type { MigrationInterface, QueryRunner } from 'typeorm'

/** A rejected request must keep a non-blank comment. */
export class RequireRejectionComment1762860000000 implements MigrationInterface {
  name = 'RequireRejectionComment1762860000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE vacation_requests
      ADD CONSTRAINT vacation_requests_reject_comment_check
      CHECK (
        status <> 'rejected'
        OR (comments IS NOT NULL AND btrim(comments) <> '')
      )
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE vacation_requests
      DROP CONSTRAINT vacation_requests_reject_comment_check
    `)
  }
}
