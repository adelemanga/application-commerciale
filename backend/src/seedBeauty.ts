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
    stock: 5,
  },
  {
    name: "Creme hydratante douceur",
    description:
      "Creme onctueuse pour hydrater la peau et apporter une sensation de confort.",
    imgUrl:
      "https://images.unsplash.com/photo-1596755389378-c31d21fd1273?auto=format&fit=crop&w=900&q=80",
    price: 32,
    stock: 4,
  },
  {
    name: "Palette maquillage rose",
    description:
      "Palette aux tons roses et champagne pour un maquillage elegant et lumineux.",
    imgUrl:
      "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=900&q=80",
    price: 45,
    stock: 3,
  },
  {
    name: "Huile capillaire sublime",
    description:
      "Huile nourrissante pour apporter brillance, douceur et soin aux cheveux.",
    imgUrl:
      "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=900&q=80",
    price: 28,
    stock: 6,
  },
  {
    name: "Kit manucure premium",
    description:
      "Selection d'accessoires et soins pour une manucure propre et brillante.",
    imgUrl:
      "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=900&q=80",
    price: 49,
    stock: 4,
  },
  {
    name: "Masque visage cocooning",
    description:
      "Masque soin pour un moment detente et une peau visiblement plus fraiche.",
    imgUrl:
      "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=900&q=80",
    price: 24,
    stock: 8,
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
      continue;
    }

    const product = await Product.save({
      name: productData.name,
      description: productData.description,
      imgUrl: productData.imgUrl,
      price: productData.price,
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
