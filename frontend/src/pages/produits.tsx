import { ApolloProvider, useMutation, useQuery } from "@apollo/client";
import { Heart } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { defaultProductImage, getProductImage } from "../utils/productImages";

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
    label: "Cheveux",
    keywords: ["capillaire", "cheveux", "huile"],
  },
} as const;

type CategoryKey = keyof typeof categories;

function ProduitsContent() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [addingProductId, setAddingProductId] = useState<string | null>(null);
  const [likedProductIds, setLikedProductIds] = useState<string[]>([]);
  const pendingProductIds = useRef<Set<string>>(new Set());
  const { data: userData } = useQuery(WHO_AM_I, {
    fetchPolicy: "network-only",
    errorPolicy: "ignore",
  });
  const isLoggedIn = Boolean(userData?.whoAmI?.isLoggedIn);
  const userEmail = userData?.whoAmI?.email;
  const { data, loading, error } = useQuery(GET_ALL_PRODUCTS, {
    fetchPolicy: "cache-and-network",
    nextFetchPolicy: "cache-first",
    notifyOnNetworkStatusChange: false,
  });
  const { data: cartData, refetch: refetchCart } = useQuery(
    GET_CURRENT_RESERVATION_BY_USER_ID,
    {
      fetchPolicy: "network-only",
      errorPolicy: "ignore",
      skip: !isLoggedIn,
    }
  );
  const [handleReservation] = useMutation(HANDLE_RESERVATION, {
    refetchQueries: [{ query: GET_CURRENT_RESERVATION_BY_USER_ID }],
  });

  useEffect(() => {
    if (!userEmail) {
      setLikedProductIds([]);
      return;
    }

    const savedLikes = window.localStorage.getItem(
      `liked-products-${userEmail}`
    );
    setLikedProductIds(savedLikes ? JSON.parse(savedLikes) : []);
  }, [userEmail]);

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
    const sellableProducts = products.filter(
      (product) => Number(product.price) > 0
    );

    if (!category) {
      return sellableProducts;
    }

    return sellableProducts.filter((product) => {
      if (product.category === selectedCategory) {
        return true;
      }

      const searchable = `${product.name} ${product.description}`.toLowerCase();
      return category.keywords.some((keyword) => searchable.includes(keyword));
    });
  }, [category, products, selectedCategory]);

  const reservation = cartData?.getCurrentReservationByUserId?.reservation;
  const totalPrice = cartData?.getCurrentReservationByUserId?.totalPrice ?? 0;
  const cartLines = useMemo(() => {
    return (reservation?.articles ?? [])
      .reduce((lines: any[], article: any) => {
        const productId =
          article.product?.id || article.product?.name || article.id;
        const existingLine = lines.find((line) => line.productId === productId);

        if (existingLine) {
          existingLine.quantity += 1;
          existingLine.lineTotal += article.product?.price ?? 0;
          return lines;
        }

        lines.push({
          productId,
          product: article.product,
          quantity: 1,
          lineTotal: article.product?.price ?? 0,
        });

        return lines;
      }, [])
      .sort((firstLine: any, secondLine: any) =>
        String(firstLine.product?.name ?? "").localeCompare(
          String(secondLine.product?.name ?? ""),
          "fr"
        )
      );
  }, [reservation?.articles]);

  const toggleLike = (productId: string) => {
    if (!isLoggedIn || !userEmail) {
      setMessage("Connectez-vous pour enregistrer vos produits favoris.");
      router.push("/connexion-client");
      return;
    }

    const nextLikedProductIds = likedProductIds.includes(productId)
      ? likedProductIds.filter((id) => id !== productId)
      : [...likedProductIds, productId];

    setLikedProductIds(nextLikedProductIds);
    window.localStorage.setItem(
      `liked-products-${userEmail}`,
      JSON.stringify(nextLikedProductIds)
    );
  };

  const addToCart = async (product: ProductWithArticles) => {
    if (pendingProductIds.current.has(product.id)) {
      return;
    }

    if (Number(product.price) <= 0) {
      setMessage(
        "Ce produit ne peut pas etre commande car son prix est invalide."
      );
      return;
    }

    setMessage("");
    setAddingProductId(product.id);
    pendingProductIds.current.add(product.id);

    if (!isLoggedIn) {
      setMessage(
        "Connectez-vous ou creez votre compte client pour ajouter ce produit au panier."
      );
      pendingProductIds.current.delete(product.id);
      setAddingProductId(null);
      router.push("/connexion-client");
      return;
    }

    const reservedArticleIds = new Set(
      reservation?.articles?.map((article: any) => article.id) ?? []
    );
    const articleId = product.articles?.find(
      (article) => !reservedArticleIds.has(article.id)
    )?.id;

    if (!articleId) {
      setMessage(
        "Toutes les unites disponibles de ce produit sont deja dans votre panier."
      );
      pendingProductIds.current.delete(product.id);
      setAddingProductId(null);
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
      setMessage(`${product.name} a été ajouté au panier.`);
    } catch {
      setMessage("Impossible d'ajouter ce produit au panier.");
    } finally {
      pendingProductIds.current.delete(product.id);
      setAddingProductId(null);
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
            ? "Decouvrez une selection adaptee a ce soin, avec les produits disponibles pour commander en ligne."
            : "Decouvrez les soins, accessoires et essentiels beaute disponibles. Ajoutez vos favoris au panier en quelques clics."}
        </p>
        {category && (
          <div className="category-actions">
            <Link href="/produits">Voir toute la boutique</Link>
          </div>
        )}
        {isLoggedIn && (
          <div className="category-actions">
            <Link href="/produits-likes">Voir mes produits favoris</Link>
          </div>
        )}
      </section>

      <div className="shop-message-slot" aria-live="polite">
        {message && <p className="shop-message">{message}</p>}
        {!message && loading && !products.length && (
          <p className="shop-message">La boutique se prepare...</p>
        )}
        {!message && error && (
          <p className="shop-message">
            Impossible d'afficher la boutique pour le moment.
          </p>
        )}
      </div>

      {!isLoggedIn && (
        <section className="shop-auth-callout">
          <p>
            Vous pouvez parcourir tous les produits disponibles. La connexion
            permet simplement de retrouver votre panier et vos commandes.
          </p>
          <div className="auth-link-row">
            <Link href="/connexion-client">Connexion</Link>
            <Link href="/inscription-client">Inscription</Link>
          </div>
        </section>
      )}

      <section className="shop-layout">
        <div className="product-grid">
          {displayedProducts.map((product) => (
            <article className="shop-card" key={product.id}>
              <button
                type="button"
                className={
                  likedProductIds.includes(product.id)
                    ? "product-heart-button liked"
                    : "product-heart-button"
                }
                onClick={() => toggleLike(product.id)}
                aria-label={
                  likedProductIds.includes(product.id)
                    ? "Retirer des favoris"
                    : "Ajouter aux favoris"
                }
              >
                <Heart aria-hidden="true" size={19} fill="currentColor" />
              </button>
              <img
                src={getProductImage(product)}
                alt={product.name}
                onError={(event) => {
                  event.currentTarget.src = defaultProductImage;
                }}
              />
              <div>
                <h2>{product.name}</h2>
                <p>{product.description}</p>
                <strong>{formatPrice(product.price)}</strong>
                <button
                  type="button"
                  onClick={() => addToCart(product)}
                  disabled={addingProductId === product.id}
                >
                  {addingProductId === product.id
                    ? "Ajout..."
                    : "Ajouter au panier"}
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
                {cartLines.map((line: any) => (
                  <li key={line.productId}>
                    <span className="mini-cart-product-name">
                      {line.product.name}
                    </span>
                    <span className="mini-cart-quantity">
                      x<strong>{line.quantity}</strong>
                    </span>
                    <strong>{formatPrice(line.lineTotal)}</strong>
                  </li>
                ))}
              </ul>
              <p className="order-total">Total : {formatPrice(totalPrice)}</p>
              <Link className="cart-link" href="/panier">
                Voir le panier
              </Link>
            </>
          ) : (
            <p>
              {isLoggedIn
                ? "Aucun produit dans le panier pour le moment."
                : "Connectez-vous pour retrouver votre panier client."}
            </p>
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
