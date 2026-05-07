import { db } from "./config/db";
import { Avis } from "../src/entities/Avis";

async function clearDb() {
  const runner = db.createQueryRunner();
  await Promise.all(
    db.entityMetadatas.map(async (entity: { tableName: any }) =>
      runner.query(`DROP TABLE IF EXISTS ${entity.tableName}`)
    )
  );
  await db.synchronize();
}

async function main() {
  await db.initialize();
  await clearDb();

  const avis1 = Avis.create({
    name: "Jean Dupont",
    lastname: "Dupont",
    message: "Service impeccable et rapide !",
    imgUrl: "http://localhost:4003/img/jean.jpg",
    rating: 5,
    title: "Super expérience !",
  });

  const avis2 = Avis.create({
    name: "Marie Curie",
    lastname: "Curie",
    message: "J'ai adoré la qualité du service.",
    imgUrl: "http://localhost:4003/img/marie.jpg",
    rating: 4,
    title: "Très bon service",
  });

  const avis3 = Avis.create({
    name: "Albert Einstein",
    lastname: "Einstein",
    message: "Une belle découverte, je recommande fortement !",
    imgUrl: "http://localhost:4003/img/albert.jpg",
    rating: 5,
    title: "Excellente expérience",
  });

  await avis1.save();
  await avis2.save();
  await avis3.save();

  console.log("Données des avis insérées avec succès !");
}

main();
