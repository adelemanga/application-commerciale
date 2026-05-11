import { ApolloProvider, useQuery } from "@apollo/client";
import { Heart } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import client from "../graphql/client";
import { GET_ALL_PRODUCTS, WHO_AM_I } from "../graphql/queries";
import { Product } from "../interface/types";

const formatPrice = (price?: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(price ?? 0);

function ProduitsLikesContent() {
  const [likedProductIds, setLikedProductIds] = useState<string[]>([]);
  const { data: userData, loading: loadingUser } = useQuery(WHO_AM_I, {
    fetchPolicy: "network-only",
  });
  const { data, loading, error } = useQuery(GET_ALL_PRODUCTS, {
    fetchPolicy: "cache-and-network",
  });
  const user = userData?.whoAmI;
  const isLoggedIn = Boolean(user?.isLoggedIn);
  const storageKey = user?.email ? `liked-products-${user.email}` : "";
  const products = useMemo<Product[]>(
    () => data?.getAllProducts ?? [],
    [data?.getAllProducts]
  );
  const likedProducts = products.filter((product) =>
    likedProductIds.includes(product.id)
  );

  useEffect(() => {
    if (!storageKey) {
      setLikedProductIds([]);
      return;
    }

    const savedLikes = window.localStorage.getItem(storageKey);
    setLikedProductIds(savedLikes ? JSON.parse(savedLikes) : []);
  }, [storageKey]);

  const removeLike = (productId: string) => {
    const nextLikedProductIds = likedProductIds.filter((id) => id !== productId);
    setLikedProductIds(nextLikedProductIds);

    if (storageKey) {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify(nextLikedProductIds)
      );
    }
  };

  return (
    <main className="shop-page liked-products-page">
      <section className="shop-hero">
        <p className="shop-kicker">Favoris</p>
        <h1>Produits likes</h1>
        <p>
          Retrouvez ici les produits que vous avez marques avec le coeur dans la
          boutique.
        </p>
        <div className="category-actions">
          <Link href="/produits">Retour boutique</Link>
          <Link href="/clients">Espace client</Link>
        </div>
      </section>

      {(loading || loadingUser) && (
        <p className="shop-message">Chargement des produits favoris...</p>
      )}
      {error && <p className="shop-message">Impossible de charger les produits.</p>}

      {!isLoggedIn ? (
        <section className="empty-cart-panel">
          <h2>Connexion client requise</h2>
          <p>Connectez-vous pour retrouver vos produits likes.</p>
          <div className="auth-link-row">
            <Link href="/connexion-client">Connexion</Link>
            <Link href="/inscription-client">Inscription</Link>
          </div>
        </section>
      ) : likedProducts.length ? (
        <section className="liked-products-page-grid">
          {likedProducts.map((product) => (
            <article className="liked-product-card" key={product.id}>
              <button
                type="button"
                className="product-heart-button liked"
                onClick={() => removeLike(product.id)}
                aria-label="Retirer des favoris"
              >
                <Heart aria-hidden="true" size={19} fill="currentColor" />
              </button>
              <img src={product.imgUrl} alt={product.name} />
              <div>
                <h2>{product.name}</h2>
                <p>{product.description}</p>
                <strong>{formatPrice(product.price)}</strong>
                <Link href="/produits">Commander dans la boutique</Link>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="empty-cart-panel">
          <h2>Aucun produit like</h2>
          <p>Ajoutez un coeur sur vos produits preferes depuis la boutique.</p>
          <Link href="/produits">Voir les produits</Link>
        </section>
      )}
    </main>
  );
}

export default function ProduitsLikesPage() {
  return (
    <ApolloProvider client={client}>
      <Header />
      <ProduitsLikesContent />
      <Footer />
    </ApolloProvider>
  );
}
