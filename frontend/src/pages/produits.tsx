import { ApolloProvider, useMutation, useQuery } from "@apollo/client";
import Link from "next/link";
import { useRouter } from "next/router";
import { useMemo, useState } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import client from "../graphql/client";
import { HANDLE_RESERVATION } from "../graphql/mutations";
import {
  GET_ALL_PRODUCTS,
  GET_CURRENT_RESERVATION_BY_USER_ID,
  WHO_AM_I,
} from "../graphql/queries";
import { Product } from "../interface/types";

type ProductWithArticles = Product & {
  articles?: { id: string }[];
};

const formatPrice = (price?: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(price ?? 0);

const categories = {
  manucure: {
    label: "Manucure",
    keywords: ["manucure", "ongle", "accessoire"],
  },
  massage: {
    label: "Massage",
    keywords: ["masque", "creme", "douceur", "cocooning", "confort"],
  },
  maquillage: {
    label: "Make up",
    keywords: ["maquillage", "palette", "teint", "serum"],
  },
  capillaires: {
    label: "Soins capillaires",
    keywords: ["capillaire", "cheveux", "huile"],
  },
} as const;

type CategoryKey = keyof typeof categories;

function ProduitsContent() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const { data: userData } = useQuery(WHO_AM_I, {
    fetchPolicy: "network-only",
  });
  const { data, loading, error } = useQuery(GET_ALL_PRODUCTS, {
    fetchPolicy: "network-only",
  });
  const { data: cartData, refetch: refetchCart } = useQuery(
    GET_CURRENT_RESERVATION_BY_USER_ID,
    { fetchPolicy: "network-only" }
  );
  const [handleReservation, { loading: adding }] = useMutation(
    HANDLE_RESERVATION,
    {
      refetchQueries: [{ query: GET_CURRENT_RESERVATION_BY_USER_ID }],
    }
  );

  const products = useMemo<ProductWithArticles[]>(
    () => data?.getAllProducts ?? [],
    [data]
  );
  const selectedCategory =
    typeof router.query.categorie === "string" &&
    router.query.categorie in categories
      ? (router.query.categorie as CategoryKey)
      : null;
  const category = selectedCategory ? categories[selectedCategory] : null;
  const displayedProducts = useMemo(() => {
    if (!category) {
      return products;
    }

    return products.filter((product) => {
      const searchable = `${product.name} ${product.description}`.toLowerCase();
      return category.keywords.some((keyword) => searchable.includes(keyword));
    });
  }, [category, products]);

  const reservation = cartData?.getCurrentReservationByUserId?.reservation;
  const totalPrice = cartData?.getCurrentReservationByUserId?.totalPrice ?? 0;
  const isLoggedIn = userData?.whoAmI?.isLoggedIn;

  const addToCart = async (product: ProductWithArticles) => {
    setMessage("");

    if (!isLoggedIn) {
      setMessage(
        "Connectez-vous ou creez un compte avant d'ajouter au panier."
      );
      return;
    }

    const articleId = product.articles?.[0]?.id;

    if (!articleId) {
      setMessage("Ce produit n'a pas encore de stock disponible.");
      return;
    }

    const today = new Date();
    const tomorrow = new Date(Date.now() + 86400000);

    try {
      await handleReservation({
        variables: {
          data: {
            articleId,
            startDate: today.toISOString(),
            endDate: tomorrow.toISOString(),
          },
        },
      });
      await refetchCart();
      setMessage(`${product.name} a ete ajoute au panier.`);
    } catch {
      setMessage("Impossible d'ajouter ce produit au panier.");
    }
  };

  return (
    <main className="shop-page products-page">
      <section className="shop-hero">
        <p className="shop-kicker">
          {category ? category.label : "Produits beaute"}
        </p>
        <h1>{category ? `Boutique ${category.label}` : "Boutique"}</h1>
        <p>
          {category
            ? "Voici les produits correspondant au theme choisi. Les prix viennent directement de la base de donnees."
            : "Les prix et les produits viennent directement de la base de donnees. Selectionnez un produit pour l'ajouter automatiquement au panier."}
        </p>
        {category && (
          <div className="category-actions">
            <Link href="/produits">Voir toute la boutique</Link>
          </div>
        )}
      </section>

      {message && <p className="shop-message">{message}</p>}
      {loading && <p className="shop-message">Chargement des produits...</p>}
      {error && (
        <p className="shop-message">Impossible de charger les produits.</p>
      )}

      {!isLoggedIn && (
        <section className="shop-auth-callout">
          <p>
            Pour ajouter un produit au panier, connectez-vous ou creez un compte
            client.
          </p>
          <div>
            <Link href="/connexion-client">Connexion ou inscription</Link>
          </div>
        </section>
      )}

      <section className="shop-layout">
        <div className="product-grid">
          {displayedProducts.map((product) => (
            <article className="shop-card" key={product.id}>
              <img src={product.imgUrl} alt={product.name} />
              <div>
                <h2>{product.name}</h2>
                <p>{product.description}</p>
                <strong>{formatPrice(product.price)}</strong>
                <button
                  type="button"
                  onClick={() => addToCart(product)}
                  disabled={adding}
                >
                  Ajouter au panier
                </button>
              </div>
            </article>
          ))}
          {!loading && !displayedProducts.length && (
            <p className="shop-message">
              Aucun produit ne correspond encore a ce theme.
            </p>
          )}
        </div>

        <aside className="order-summary">
          <h2>Panier</h2>
          {reservation?.articles?.length ? (
            <>
              <ul>
                {reservation.articles.map((article: any) => (
                  <li key={article.id}>
                    <span>{article.product.name}</span>
                    <strong>{formatPrice(article.product.price)}</strong>
                  </li>
                ))}
              </ul>
              <p className="order-total">Total : {formatPrice(totalPrice)}</p>
              <Link className="cart-link" href="/panier">
                Voir le panier
              </Link>
            </>
          ) : (
            <p>Aucun produit dans le panier pour le moment.</p>
          )}
        </aside>
      </section>
    </main>
  );
}

export default function ProduitsPage() {
  return (
    <ApolloProvider client={client}>
      <Header />
      <ProduitsContent />
      <Footer />
    </ApolloProvider>
  );
}
