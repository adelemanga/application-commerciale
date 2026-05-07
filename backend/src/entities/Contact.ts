import { Field, ObjectType } from "type-graphql";
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  BaseEntity,
  ManyToOne,
} from "typeorm";

@ObjectType()
@Entity()
export class Contact extends BaseEntity {
  @Field()
  @PrimaryGeneratedColumn()
  id: number;

  @Field()
  @Column()
  name: string;

  @Field()
  @Column()
  lastname: string;

  @Field()
  @Column()
  email: string;

  @Field()
  @Column()
  message: string;

}
