import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Field, ID, ObjectType } from "type-graphql";
import { User } from "./User";

@ObjectType()
@Entity()
export class ClientMessage extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id: string;

  @Field()
  @Column("text")
  message: string;

  @Field()
  @Column({ default: "Admin" })
  senderRole: string;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field({ nullable: true })
  @Column({ nullable: true })
  readAt?: Date;

  @Field(() => User)
  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  client: User;
}
