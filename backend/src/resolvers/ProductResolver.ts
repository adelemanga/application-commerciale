import { Like } from "typeorm";
import { Article } from "../entities/Article";
import { Product } from "../entities/Product";
import {
  Arg,
  Authorized,
  Field,
  InputType,
  Mutation,
  Query,
  Resolver,
  ID,
} from "type-graphql";
import { Role } from "../entities/User";

const productCategories = ["manucure", "massage", "maquillage", "capillaires"];

@InputType()
class NewProductInput implements Partial<Product> {
  @Field()
  name: string;

  @Field()
  description: string;

  @Field(() => String, { nullable: true })
  imgUrl?: string | undefined;

  @Field()
  price: number;

  @Field({ nullable: true })
  category?: string;
}

const normalizeProductCategory = (category?: string) => {
  const normalizedCategory = category?.trim();

  if (!normalizedCategory || !productCategories.includes(normalizedCategory)) {
    throw new Error(
      "Choisissez une categorie valide : manucure, massage, maquillage ou cheveux."
    );
  }

  return normalizedCategory;
};

const normalizeProductImage = (imgUrl?: string) => {
  const normalizedImage = imgUrl?.trim();

  if (!normalizedImage) {
    throw new Error("Ajoutez une image avant d'enregistrer ce produit.");
  }

  return normalizedImage;
};

const normalizeProductText = (value: string, fieldName: string) => {
  const cleanValue = value.replace(/;\)|😉/g, "").trim();

  if (!cleanValue) {
    throw new Error(`Renseignez ${fieldName} du produit.`);
  }

  return cleanValue;
};

// data from range picker
@InputType()
class ProductDateRangeInput {
  @Field(() => Date, { nullable: true })
  startDate: Date;

  @Field(() => Date, { nullable: true })
  endDate: Date;
}

@Resolver(Product)
class ProductResolver {
  @Query(() => [Product])
  async getAllProducts() {
    const products = await Product.find({
      order: {
        id: "ASC",
      },
    });

    return Promise.all(
      products.map(async (product) => {
        product.stockCount = await Article.count({
          where: {
            product: {
              id: product.id,
            },
          },
        });
        product.articles = await Article.createQueryBuilder("article")
          .leftJoin("article.product", "product")
          .where("product.id = :productId", { productId: product.id })
          .orderBy("article.id", "ASC")
          .take(80)
          .getMany();

        return product;
      })
    );
  }

  @Authorized(Role.Admin)
  @Mutation(() => Product)
  async createNewProduct(@Arg("data") newProductData: NewProductInput) {
    const category = normalizeProductCategory(newProductData.category);
    const imgUrl = normalizeProductImage(newProductData.imgUrl);
    const name = normalizeProductText(newProductData.name, "le nom");
    const description = normalizeProductText(
      newProductData.description,
      "la description"
    );
    const resultFromSave = await Product.save({
      ...newProductData,
      name,
      description,
      category,
      imgUrl,
    });

    return resultFromSave;
  }

  @Authorized(Role.Admin)
  @Mutation(() => Product)
  async setProductStock(
    @Arg("productId", () => ID) productId: string,
    @Arg("quantity") quantity: number
  ) {
    const targetQuantity = Math.max(0, Math.floor(quantity));
    const product = await Product.findOne({
      where: { id: productId },
      relations: {
        articles: {
          reservations: true,
        },
      },
    });

    if (!product) {
      throw new Error("Product not found");
    }

    const currentArticles = product.articles ?? [];
    const difference = targetQuantity - currentArticles.length;

    if (difference > 0) {
      const articlesToCreate = Array.from({ length: difference }, () =>
        Article.create({ product })
      );
      await Article.save(articlesToCreate);
    }

    if (difference < 0) {
      const removableArticles = currentArticles.filter(
        (article) => !article.reservations || article.reservations.length === 0
      );
      const numberToRemove = Math.abs(difference);

      if (removableArticles.length < numberToRemove) {
        throw new Error("Cannot remove articles already attached to orders");
      }

      await Article.remove(removableArticles.slice(0, numberToRemove));
    }

    const updatedProduct = await Product.findOneOrFail({
      where: { id: productId },
      relations: {
        articles: {
          reservations: true,
        },
      },
    });
    updatedProduct.stockCount = updatedProduct.articles?.length ?? targetQuantity;

    return updatedProduct;
  }

  @Query(() => Product)
  async getOneProductById(@Arg("productId", () => ID) productId: string) {
    const product = await Product.findOne({
      where: { id: productId },
      relations: ["articles"],
    });
    return product;
  }

  @Query(() => [Product])
  async searchAndFilterProducts(
    @Arg("keyword", { nullable: true }) keyword?: string,
    @Arg("dateRangeInput", { nullable: true })
    dateRangeInput?: ProductDateRangeInput
  ) {
    let products: Product[];

    if (keyword) {
      products = await Product.find({
        where: [{ name: Like(`%${keyword}%`) }],
        relations: {
          articles: {
            reservations: true,
          },
        },
      });
    } else {
      products = await Product.find({
        relations: {
          articles: {
            reservations: true,
          },
        },
      });
    }

    if (!dateRangeInput) {
      return products;
    }
    const availableProducts = products.filter((product) => {
      // si un produit n'a pas d'article associé il n'est pas dispo pas dispo
      if (!product.articles || product.articles.length === 0) {
        return false;
      }

      // si un produit a au moins un article dispo, on l'affiche
      return product.articles.some((article) => {
        // si un article n'a pas de réservation associée, il est dispo
        if (!article.reservations || article.reservations.length === 0) {
          return true;
        }

        // je regarde les réservations pour chaque article.
        // la fonction renvoie false si, pour au moins une réservation :
        return article.reservations.every((reservation) => {
          return (
            reservation.endDate < dateRangeInput.startDate || // la date de début que j'ai choisie tombe avant la fin de la réservation
            reservation.startDate > dateRangeInput.endDate // la date de fin que j'ai choisie tombe après le début de la réservation
          );
        });
      });
    });

    return availableProducts;
  }

  @Authorized(Role.Admin)
  @Mutation(() => Product)
  async editProduct(
    @Arg("productId", () => ID) productId: string,
    @Arg("data") newProductData: NewProductInput
  ) {
    const product = await Product.findOneByOrFail({
      id: productId,
    });

    product.name = normalizeProductText(newProductData.name, "le nom");
    product.description = normalizeProductText(
      newProductData.description,
      "la description"
    );
    product.price = newProductData.price;
    product.category = normalizeProductCategory(newProductData.category);
    product.imgUrl = normalizeProductImage(newProductData.imgUrl);

    const updatedProduct = await product.save();
    return updatedProduct;
  }

  // un produit est supprimé avec les articles qui lui sont associés
  @Authorized(Role.Admin)
  @Mutation(() => String)
  async deleteProduct(@Arg("id", () => ID) idToDelete: string) {
    const articlesToDelete = await Article.find({
      where: { product: { id: idToDelete } },
      relations: {
        reservations: true,
      },
    });

    const isLinkedToOrder = articlesToDelete.some(
      (article) => article.reservations && article.reservations.length > 0
    );

    if (isLinkedToOrder) {
      throw new Error(
        "Impossible de supprimer un produit deja rattache a une commande."
      );
    }

    await Article.remove(articlesToDelete);
    await Product.delete(idToDelete);
    return `Product deleted successfully`;
  }
}

export default ProductResolver;
