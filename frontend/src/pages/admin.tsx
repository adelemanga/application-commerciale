import { ApolloProvider, useMutation, useQuery } from "@apollo/client";
import Link from "next/link";
import { useRouter } from "next/router";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import client from "../graphql/client";
import {
  CREATE_NEW_ARTICLE,
  CREATE_NEW_PRODUCT,
  DELETE_PRODUCT,
  EDIT_PRODUCT,
  SET_PRODUCT_STOCK,
  UPDATE_RESERVATION_ADMIN,
} from "../graphql/mutations";
import {
  GET_ALL_PRODUCTS,
  GET_ALL_RESERVATIONS,
  WHO_AM_I,
} from "../graphql/queries";
import { Product, Role } from "../interface/types";

type ProductWithArticles = Product & {
  articles?: { id: string }[];
};

type ProductForm = {
  name: string;
  description: string;
  imgUrl: string;
  price: string;
  stock: string;
};

const emptyProduct: ProductForm = {
  name: "",
  description: "",
  imgUrl: "",
  price: "",
  stock: "1",
};

const formatPrice = (price?: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(price ?? 0);

const statusLabels: Record<string, string> = {
  pending: "pending",
  submitted: "submitted",
  validated: "validee",
  ongoing: "preparation",
  ended: "terminee",
};

const paymentLabels: Record<string, string> = {
  pending: "a payer",
  paid: "paye",
};

function AdminContent() {
  const [form, setForm] = useState<ProductForm>(emptyProduct);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [imageInputKey, setImageInputKey] = useState(0);
  const [stockInputs, setStockInputs] = useState<Record<string, string>>({});
  const { data, loading, error } = useQuery(GET_ALL_PRODUCTS);
  const {
    data: reservationsData,
    loading: loadingReservations,
    error: reservationsError,
  } = useQuery(GET_ALL_RESERVATIONS, {
    fetchPolicy: "network-only",
  });
  const [createProduct, { loading: creating }] = useMutation(CREATE_NEW_PRODUCT, {
    refetchQueries: [{ query: GET_ALL_PRODUCTS }],
  });
  const [createArticle] = useMutation(CREATE_NEW_ARTICLE, {
    refetchQueries: [{ query: GET_ALL_PRODUCTS }],
  });
  const [deleteProduct] = useMutation(DELETE_PRODUCT, {
    refetchQueries: [{ query: GET_ALL_PRODUCTS }],
  });
  const [editProduct, { loading: editing }] = useMutation(EDIT_PRODUCT, {
    refetchQueries: [{ query: GET_ALL_PRODUCTS }],
  });
  const [setProductStock, { loading: updatingStock }] = useMutation(
    SET_PRODUCT_STOCK,
    {
      refetchQueries: [{ query: GET_ALL_PRODUCTS }],
    }
  );
  const [updateReservationAdmin] = useMutation(UPDATE_RESERVATION_ADMIN, {
    refetchQueries: [{ query: GET_ALL_RESERVATIONS }],
  });

  const products = useMemo<ProductWithArticles[]>(
    () => data?.getAllProducts ?? [],
    [data]
  );

  const reservations = reservationsData?.getAllReservations ?? [];

  useEffect(() => {
    setStockInputs((current) => {
      const next = { ...current };
      products.forEach((product) => {
        if (next[product.id] === undefined) {
          next[product.id] = String(product.articles?.length ?? 0);
        }
      });
      return next;
    });
  }, [products]);

  const handleChange = (
    field: keyof ProductForm,
    value: string
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetProductForm = () => {
    setForm(emptyProduct);
    setEditingProductId(null);
    setImageInputKey((current) => current + 1);
  };

  const submitProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice("");

    try {
      if (editingProductId) {
        await editProduct({
          variables: {
            productId: editingProductId,
            data: {
              name: form.name,
              description: form.description,
              imgUrl: form.imgUrl,
              price: Number(form.price),
            },
          },
        });
        await setProductStock({
          variables: {
            productId: editingProductId,
            quantity: Math.max(0, Number(form.stock) || 0),
          },
        });
        resetProductForm();
        setNotice("Produit modifie.");
        return;
      }

      const productResult = await createProduct({
        variables: {
          data: {
            name: form.name,
            description: form.description,
            imgUrl: form.imgUrl,
            price: Number(form.price),
          },
        },
      });
      const productId = productResult.data?.createNewProduct?.id;
      const stockCount = Math.max(1, Number(form.stock) || 1);

      if (productId) {
        await Promise.all(
          Array.from({ length: stockCount }, () =>
            createArticle({
              variables: {
                data: {
                  productId,
                  availability: true,
                },
              },
            })
          )
        );
      }
      resetProductForm();
      setNotice("Produit ajoute avec son stock.");
    } catch {
      setNotice("Impossible d'enregistrer le produit. Verifiez vos droits admin.");
    }
  };

  const selectImageFile = (event: ChangeEvent<HTMLInputElement>) => {
    setNotice("");
    const file = event.target.files?.[0];

    if (!file) {
      handleChange("imgUrl", "");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setNotice("Selectionnez un fichier image valide.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        handleChange("imgUrl", reader.result);
      }
    };
    reader.onerror = () => {
      setNotice("Impossible de lire cette image.");
    };
    reader.readAsDataURL(file);
  };

  const changeStockInput = (productId: string, value: string) => {
    setStockInputs((current) => ({ ...current, [productId]: value }));
  };

  const addStock = async (productId: string) => {
    setNotice("");
    try {
      await createArticle({
        variables: {
          data: {
            productId,
            availability: true,
          },
        },
      });
      setNotice("Stock ajoute pour ce produit.");
    } catch {
      setNotice("Impossible d'ajouter le stock.");
    }
  };

  const updateProductStock = async (product: ProductWithArticles) => {
    setNotice("");
    const quantity = Math.max(0, Number(stockInputs[product.id]) || 0);

    try {
      await setProductStock({
        variables: {
          productId: product.id,
          quantity,
        },
      });
      setNotice(`Stock de ${product.name} mis a jour a ${quantity}.`);
    } catch {
      setNotice(
        "Impossible de baisser ce stock : certaines unites sont deja dans des commandes."
      );
    }
  };

  const startEditingProduct = (product: ProductWithArticles) => {
    setNotice("");
    setEditingProductId(product.id);
    setForm({
      name: product.name ?? "",
      description: product.description ?? "",
      imgUrl: product.imgUrl ?? "",
      price: String(product.price ?? ""),
      stock: String(product.articles?.length ?? 0),
    });
    setImageInputKey((current) => current + 1);
  };

  const updateOrder = async (
    reservationId: string,
    status: string,
    paymentStatus: string
  ) => {
    setNotice("");
    try {
      await updateReservationAdmin({
        variables: {
          reservationId,
          status,
          paymentStatus,
        },
      });
      setNotice("Commande mise a jour.");
    } catch {
      setNotice("Impossible de modifier cette commande.");
    }
  };

  return (
    <main className="admin-page">
      <section className="admin-hero">
        <p className="shop-kicker">Administration</p>
        <h1>Interface administrateur</h1>
        <p>
          Retrouvez les reservations clients, les produits commandes, les prix
          et la gestion du stock au meme endroit.
        </p>
        <div className="admin-shortcuts">
          <a href="#commandes-clients">Reservations</a>
          <a href="#gestion-produits">Produits</a>
          <Link href="/inscription-administrateur">Nouvel admin</Link>
        </div>
      </section>

      {notice && <p className="shop-message">{notice}</p>}

      <section className="admin-panel admin-orders" id="commandes-clients">
        <div className="admin-section-heading">
          <div>
            <p className="shop-kicker">Commandes</p>
            <h2>Liste des reservations</h2>
          </div>
          <strong>{reservations.length} commande(s)</strong>
        </div>
        {loadingReservations && <p>Chargement des commandes...</p>}
        {reservationsError && <p>Impossible de charger les commandes.</p>}
        {!loadingReservations && !reservations.length && (
          <p>Aucune commande client pour le moment.</p>
        )}
        <div className="orders-table">
          {reservations.map((reservation: any) => {
            const total = reservation.articles.reduce(
              (sum: number, article: any) => sum + (article.product?.price ?? 0),
              0
            );

            return (
              <article className="order-row" key={reservation.id}>
                <div className="order-head">
                  <span>Reservation #{reservation.id}</span>
                  <div>
                    <span className={`status-pill status-${reservation.status}`}>
                      {statusLabels[reservation.status] || reservation.status}
                    </span>
                    <span className={`status-pill payment-${reservation.paymentStatus}`}>
                      {paymentLabels[reservation.paymentStatus] ||
                        reservation.paymentStatus}
                    </span>
                  </div>
                </div>
                <div className="order-customer">
                  <span className="admin-mini-label">Client</span>
                  <strong>
                    {reservation.user?.firstname} {reservation.user?.lastname}
                  </strong>
                  <p>Email : {reservation.user?.email}</p>
                  <p>
                    Tel :{" "}
                    {reservation.customerPhone ||
                      reservation.user?.phone ||
                      "non renseigne"}
                  </p>
                  <p>
                    Adresse :{" "}
                    {reservation.customerAddress ||
                      reservation.user?.address ||
                      "non renseignee"}
                  </p>
                </div>
                <div className="order-products">
                  <span className="admin-mini-label">Produits commandes</span>
                  <p>
                    Du{" "}
                    {new Date(reservation.startDate).toLocaleDateString("fr-FR")} au{" "}
                    {new Date(reservation.endDate).toLocaleDateString("fr-FR")}
                  </p>
                  <p>
                    {reservation.articles.length} produit(s) - {formatPrice(total)}
                  </p>
                  <ul>
                    {reservation.articles.map((article: any) => (
                      <li key={article.id}>
                        <img
                          src={article.product?.imgUrl}
                          alt={article.product?.name}
                        />
                        <span>{article.product?.name}</span>
                        <strong>{formatPrice(article.product?.price)}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="order-statuses">
                  <span className="admin-mini-label">Gestion</span>
                  <label>
                    Statut commande
                    <select
                      value={reservation.status}
                      onChange={(event) =>
                        updateOrder(
                          reservation.id,
                          event.target.value,
                          reservation.paymentStatus
                        )
                      }
                    >
                      <option value="pending">pending - panier</option>
                      <option value="submitted">submitted - envoyee</option>
                      <option value="validated">validated - validee</option>
                      <option value="ongoing">ongoing - preparation</option>
                      <option value="ended">ended - terminee / annulee</option>
                    </select>
                  </label>
                  <label>
                    Paiement
                    <select
                      value={reservation.paymentStatus}
                      onChange={(event) =>
                        updateOrder(
                          reservation.id,
                          reservation.status,
                          event.target.value
                        )
                      }
                    >
                      <option value="pending">pending - a payer</option>
                      <option value="paid">paid - paye</option>
                    </select>
                  </label>
                  <span className="status-pill payment-pill">
                    {reservation.paymentMethod === "card" ? "Carte" : "Livraison"}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="admin-layout" id="gestion-produits">
        <form className="admin-form" onSubmit={submitProduct}>
          <h2>{editingProductId ? "Modifier le produit" : "Nouveau produit"}</h2>
          <label>
            Nom
            <input
              required
              minLength={10}
              value={form.name}
              onChange={(event) => handleChange("name", event.target.value)}
            />
          </label>
          <label>
            Description
            <textarea
              required
              value={form.description}
              onChange={(event) =>
                handleChange("description", event.target.value)
              }
            />
          </label>
          <label>
            Image
            <input
              key={imageInputKey}
              type="file"
              accept="image/*"
              onChange={selectImageFile}
            />
          </label>
          {form.imgUrl && (
            <img
              className="admin-image-preview"
              src={form.imgUrl}
              alt="Apercu du produit"
            />
          )}
          <label>
            Prix
            <input
              required
              type="number"
              min="0"
              step="1"
              value={form.price}
              onChange={(event) => handleChange("price", event.target.value)}
            />
          </label>
          <label>
            Stock souhaite
            <input
              required
              type="number"
              min={editingProductId ? "0" : "1"}
              step="1"
              value={form.stock}
              onChange={(event) => handleChange("stock", event.target.value)}
            />
          </label>
          <button type="submit" disabled={creating || editing || updatingStock}>
            {editingProductId ? "Enregistrer les modifications" : "Ajouter le produit"}
          </button>
          {editingProductId && (
            <button
              type="button"
              className="secondary-button"
              onClick={resetProductForm}
            >
              Annuler
            </button>
          )}
        </form>

        <section className="admin-panel">
          <div className="admin-section-heading compact">
            <div>
              <p className="shop-kicker">Catalogue</p>
              <h2>Liste des produits</h2>
            </div>
            <strong>{products.length} produit(s)</strong>
          </div>
          {loading && <p>Chargement...</p>}
          {error && <p>Impossible de charger les produits.</p>}
          <div className="admin-product-list">
            {products.map((product) => (
              <article className="admin-product" key={product.id}>
                <img src={product.imgUrl} alt={product.name} />
                <div>
                  <h3>{product.name}</h3>
                  <p>{formatPrice(product.price)}</p>
                  <p>{product.articles?.length ?? 0} article(s) en stock</p>
                </div>
                <div className="stock-editor">
                  <label>
                    Quantite stock
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={stockInputs[product.id] ?? product.articles?.length ?? 0}
                      onChange={(event) =>
                        changeStockInput(product.id, event.target.value)
                      }
                    />
                  </label>
                  <button
                    type="button"
                    disabled={updatingStock}
                    onClick={() => updateProductStock(product)}
                  >
                    Definir stock
                  </button>
                </div>
                <div className="admin-actions">
                  <button
                    type="button"
                    onClick={() => startEditingProduct(product)}
                  >
                    Modifier
                  </button>
                  <button type="button" onClick={() => addStock(product.id)}>
                    Ajouter stock
                  </button>
                  <button
                    type="button"
                    className="danger-button"
                    onClick={() =>
                      deleteProduct({ variables: { deleteProductId: product.id } })
                    }
                  >
                    Supprimer
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>

    </main>
  );
}

export default function AdminPage() {
  return (
    <ApolloProvider client={client}>
      <Header />
      <AdminGate />
      <Footer />
    </ApolloProvider>
  );
}

function AdminGate() {
  const router = useRouter();
  const { data, loading } = useQuery(WHO_AM_I, {
    fetchPolicy: "network-only",
  });
  const isAdmin =
    data?.whoAmI?.isLoggedIn && data?.whoAmI?.role === Role.Admin;

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace("/connexion-administrateur");
    }
  }, [isAdmin, loading, router]);

  if (loading) {
    return <p className="auth-message">Verification de vos droits...</p>;
  }

  if (!isAdmin) {
    return null;
  }

  return <AdminContent />;
}
