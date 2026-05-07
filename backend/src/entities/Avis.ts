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
export class Avis extends BaseEntity {
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
  message: string;

  @Field()
  @Column({
    default:
      "https://img.freepik.com/premium-vector/default-image-icon-vector-missing-picture-page-website-design-mobile-app-no-photo-available_87543-11093.jpg",
  })
  imgUrl: string;

  @Field()
  @Column({ nullable: true })
  rating: number;

  @Field()
  @Column({ nullable: true })
  title: string;
}
