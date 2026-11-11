import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateDomainSchema1762810000000 implements MigrationInterface {
  name = 'CreateDomainSchema1762810000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS foundation_meta`)

    await queryRunner.query(`
      CREATE TABLE users (
        id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        name varchar(255) NOT NULL,
        email varchar(255) NOT NULL,
        password_hash varchar(255) NOT NULL,
        role varchar(32) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT users_email_unique UNIQUE (email),
        CONSTRAINT users_role_check CHECK (role IN ('requester', 'validator'))
      )
    `)

    await queryRunner.query(`
      CREATE TABLE vacation_requests (
        id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        start_date date NOT NULL,
        end_date date NOT NULL,
        reason text NULL,
        status varchar(32) NOT NULL,
        comments text NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT vacation_requests_status_check
          CHECK (status IN ('pending', 'approved', 'rejected')),
        CONSTRAINT vacation_requests_dates_check
          CHECK (end_date > start_date)
      )
    `)

    await queryRunner.query(`
      CREATE INDEX vacation_requests_user_id_idx ON vacation_requests (user_id)
    `)
    await queryRunner.query(`
      CREATE INDEX vacation_requests_status_idx ON vacation_requests (status)
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS vacation_requests`)
    await queryRunner.query(`DROP TABLE IF EXISTS users`)
  }
}
