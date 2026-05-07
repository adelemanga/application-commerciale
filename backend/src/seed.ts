import { db } from "./config/db";
import { Avis } from "./entities/Avis";

const advices = [
  {
    name: "Jean Dupont",
    lastname: "Dupont",
    message: "Service impeccable et rapide !",
    imgUrl: "https://i.imgur.com/1LdqBMP.jpeg",
    rating: 5,
    title: "Super expérience !",
  },
  {
    name: "Marie Curie",
    lastname: "Curie",
    message: "J'ai adoré la qualité du service.",
    imgUrl: "https://i.imgur.com/1LdqBMP.jpeg",
    rating: 4,
    title: "Très bon service",
  },
  {
    name: "Albert Einstein",
    lastname: "Einstein",
    message: "Une belle découverte, je recommande fortement !",
    imgUrl: "https://i.imgur.com/1LdqBMP.jpeg",
    rating: 5,
    title: "Excellente expérience",
  },
  {
    name: "Sophie Germain",
    lastname: "Germain",
    message: "Un accueil chaleureux et des prestations au top.",
    imgUrl: "https://i.imgur.com/1LdqBMP.jpeg",
    rating: 5,
    title: "Un service exceptionnel",
  },
  {
    name: "Isaac Newton",
    lastname: "Newton",
    message: "Expérience très satisfaisante, je reviendrai sûrement !",
    imgUrl: "https://i.imgur.com/1LdqBMP.jpeg",
    rating: 4,
    title: "Très bon rapport qualité-prix",
  },
];

const seedDatabase = async () => {
  await db.initialize();
  await db.getRepository(Avis).save(advices);

  console.log("Données des avis insérées avec succès !");
  await db.destroy();
};

seedDatabase().catch(console.error);
