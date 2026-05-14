import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "./config/db";
import { Article } from "./entities/Article";
import { Product } from "./entities/Product";
import { Role, User } from "./entities/User";

const products = [
  {
    name: "Serum eclat visage",
    description:
      "Serum leger pour illuminer le teint et preparer la peau avant le maquillage.",
    imgUrl:
      "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=900&q=80",
    price: 39,
    category: "maquillage",
    stock: 5,
  },
  {
    name: "Creme hydratante douceur",
    description:
      "Creme onctueuse pour hydrater la peau et apporter une sensation de confort.",
    imgUrl:
      "https://images.unsplash.com/photo-1596755389378-c31d21fd1273?auto=format&fit=crop&w=900&q=80",
    price: 32,
    category: "massage",
    stock: 4,
  },
  {
    name: "Palette maquillage rose",
    description:
      "Palette aux tons roses et champagne pour un maquillage elegant et lumineux.",
    imgUrl:
      "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=900&q=80",
    price: 45,
    category: "maquillage",
    stock: 3,
  },
  {
    name: "Huile capillaire sublime",
    description:
      "Huile nourrissante pour apporter brillance, douceur et soin aux cheveux.",
    imgUrl:
      "https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=900&q=80",
    price: 28,
    category: "capillaires",
    stock: 6,
  },
  {
    name: "Kit manucure premium",
    description:
      "Selection d'accessoires et soins pour une manucure propre et brillante.",
    imgUrl:
      "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=900&q=80",
    price: 49,
    category: "manucure",
    stock: 4,
  },
  {
    name: "Vernis rose poudré longue tenue",
    description:
      "Vernis lumineux au fini rose doux pour une manucure elegante et soignee.",
    imgUrl:
      "https://images.unsplash.com/photo-1607779097040-26e80aa78e66?auto=format&fit=crop&w=900&q=80",
    price: 14,
    category: "manucure",
    stock: 12,
  },
  {
    name: "Huile cuticules nourrissante",
    description:
      "Soin nourrissant pour hydrater les cuticules et renforcer l'aspect des ongles.",
    imgUrl:
      "https://images.unsplash.com/photo-1599948128020-9a44505b0d1b?auto=format&fit=crop&w=900&q=80",
    price: 18,
    category: "manucure",
    stock: 10,
  },
  {
    name: "Lime et polissoir professionnel",
    description:
      "Accessoire essentiel pour preparer, lisser et faire briller les ongles.",
    imgUrl:
      "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=900&q=80",
    price: 11,
    category: "manucure",
    stock: 15,
  },
  {
    name: "Masque visage cocooning",
    description:
      "Masque soin pour un moment detente et une peau visiblement plus fraiche.",
    imgUrl:
      "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=900&q=80",
    price: 24,
    category: "massage",
    stock: 8,
  },
  {
    name: "Huile massage relaxante",
    description:
      "Huile soyeuse pour accompagner un massage detente et laisser la peau douce.",
    imgUrl:
      "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=900&q=80",
    price: 26,
    category: "massage",
    stock: 9,
  },
  {
    name: "Bougie spa parfum fleur blanche",
    description:
      "Bougie parfumee pour creer une ambiance calme pendant un soin ou un massage.",
    imgUrl:
      "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=900&q=80",
    price: 19,
    category: "massage",
    stock: 7,
  },
  {
    name: "Gommage corps satin",
    description:
      "Gommage corps doux pour lisser la peau avant un rituel de massage.",
    imgUrl:
      "https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?auto=format&fit=crop&w=900&q=80",
    price: 31,
    category: "massage",
    stock: 6,
  },
  {
    name: "Gloss nude brillance",
    description:
      "Gloss confortable pour apporter une touche lumineuse et naturelle aux levres.",
    imgUrl:
      "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=80",
    price: 17,
    category: "maquillage",
    stock: 14,
  },
  {
    name: "Pinceaux maquillage essentiels",
    description:
      "Set de pinceaux pour appliquer le teint, les poudres et les fards avec precision.",
    imgUrl:
      "https://images.unsplash.com/photo-1522338242992-e1a54906a8da?auto=format&fit=crop&w=900&q=80",
    price: 34,
    category: "maquillage",
    stock: 8,
  },
  {
    name: "Blush peche lumineux",
    description:
      "Blush poudre au ton peche pour rechauffer le teint avec un fini frais.",
    imgUrl:
      "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80",
    price: 22,
    category: "maquillage",
    stock: 10,
  },
  {
    name: "Shampoing brillance douce",
    description:
      "Shampoing soin pour nettoyer en douceur et raviver la brillance des cheveux.",
    imgUrl:
      "https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=900&q=80",
    price: 21,
    category: "capillaires",
    stock: 12,
  },
  {
    name: "Masque cheveux nutrition intense",
    description:
      "Masque riche pour nourrir les longueurs et aider a retrouver douceur et souplesse.",
    imgUrl:
      "https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=900&q=80",
    price: 29,
    category: "capillaires",
    stock: 9,
  },
  {
    name: "Brosse demelante douceur",
    description:
      "Brosse pratique pour demeler les cheveux sans tirer et faciliter le coiffage.",
    imgUrl:
      "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?auto=format&fit=crop&w=900&q=80",
    price: 16,
    category: "capillaires",
    stock: 11,
  },
];

const seedBeauty = async () => {
  await db.initialize();

  const adminEmail = "admin@beautyplace.fr";
  const existingAdmin = await User.findOne({ where: { email: adminEmail } });

  if (!existingAdmin) {
    await User.save({
      email: adminEmail,
      firstname: "Admin",
      lastname: "Beauty",
      hashedPassword: await bcrypt.hash("admin123", 10),
      role: Role.Admin,
    });
  }

  for (const productData of products) {
    const existingProduct = await Product.findOne({
      where: { name: productData.name },
      relations: ["articles"],
    });

    if (existingProduct) {
      const shouldUpdateProduct =
        existingProduct.category !== productData.category ||
        existingProduct.description !== productData.description ||
        existingProduct.imgUrl !== productData.imgUrl ||
        Number(existingProduct.price) !== productData.price;

      if (shouldUpdateProduct) {
        existingProduct.description = productData.description;
        existingProduct.imgUrl = productData.imgUrl;
        existingProduct.price = productData.price;
        existingProduct.category = productData.category;
        await existingProduct.save();
      }
      continue;
    }

    const product = await Product.save({
      name: productData.name,
      description: productData.description,
      imgUrl: productData.imgUrl,
      price: productData.price,
      category: productData.category,
    });

    await Article.save(
      Array.from({ length: productData.stock }, () =>
        Article.create({ product })
      )
    );
  }

  await db.destroy();
  console.log("Produits beaute, images, prix, stock et admin ajoutes.");
};

seedBeauty().catch(async (error) => {
  console.error(error);
  if (db.isInitialized) {
    await db.destroy();
  }
});
