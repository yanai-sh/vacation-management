import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { User } from './User'

export type VacationStatus = 'pending' | 'approved' | 'rejected'

@Entity({ name: 'vacation_requests' })
export class VacationRequest {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ name: 'user_id', type: 'int' })
  userId!: number

  @ManyToOne(() => User, (user) => user.vacationRequests, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User

  @Column({ name: 'start_date', type: 'date' })
  startDate!: string

  @Column({ name: 'end_date', type: 'date' })
  endDate!: string

  @Column({ type: 'text', nullable: true })
  reason!: string | null

  @Column({ type: 'varchar', length: 32 })
  status!: VacationStatus

  @Column({ type: 'text', nullable: true })
  comments!: string | null

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date
}
