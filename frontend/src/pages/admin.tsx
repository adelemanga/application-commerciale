import { ApolloProvider, useMutation, useQuery } from "@apollo/client";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  category: string;
  imgUrl: string;
  price: string;
  stock: string;
};

type OrderDraft = {
  status: string;
  paymentStatus: string;
  shippingCarrier: string;
  trackingNumber: string;
};

const emptyProduct: ProductForm = {
  name: "",
  description: "",
  category: "",
  imgUrl: "",
  price: "",
  stock: "1",
};

const productCategories = [
  { value: "manucure", label: "Manucure" },
  { value: "massage", label: "Massage" },
  { value: "maquillage", label: "Make up" },
  { value: "capillaires", label: "Cheveux" },
];

const categoryLabels = productCategories.reduce<Record<string, string>>(
  (labels, category) => ({ ...labels, [category.value]: category.label }),
  {}
);

const formatPrice = (price?: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(price ?? 0);

const statusLabels: Record<string, string> = {
  pending: "booking",
  submitted: "commande recue",
  validated: "validee",
  ongoing: "preparation",
  shipped: "en cours de livraison",
  ended: "terminee",
};

const paymentLabels: Record<string, string> = {
  pending: "a payer",
  paid: "paye",
};

const deliveryLabels: Record<string, string> = {
  home: "Livraison a domicile",
  relay: "Point relais",
  store: "Retrait magasin",
};

const groupArticlesByProduct = (articles: any[] = []) =>
  articles.reduce((groups: any[], article: any) => {
    const product = article.product ?? {};
    const productKey = product.id ?? product.name ?? article.id;
    const existingGroup = groups.find((group) => group.productKey === productKey);

    if (existingGroup) {
      existingGroup.quantity += 1;
      existingGroup.total += product.price ?? 0;
      return groups;
    }

    groups.push({
      productKey,
      product,
      quantity: 1,
      total: product.price ?? 0,
    });

    return groups;
  }, []);

function AdminContent() {
  const [form, setForm] = useState<ProductForm>(emptyProduct);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [imageInputKey, setImageInputKey] = useState(0);
  const [stockInputs, setStockInputs] = useState<Record<string, string>>({});
  const [orderDrafts, setOrderDrafts] = useState<Record<string, OrderDraft>>({});
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [updatingStockProductId, setUpdatingStockProductId] = useState<string | null>(
    null
  );
  const productFormRef = useRef<HTMLFormElement | null>(null);
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
  const [setProductStock] = useMutation(SET_PRODUCT_STOCK, {
    refetchQueries: [{ query: GET_ALL_PRODUCTS }],
  });
  const [updateReservationAdmin] = useMutation(UPDATE_RESERVATION_ADMIN, {
    refetchQueries: [{ query: GET_ALL_RESERVATIONS }],
  });

  const products = useMemo<ProductWithArticles[]>(
    () => data?.getAllProducts ?? [],
    [data]
  );

  const reservations = (reservationsData?.getAllReservations ?? []).filter(
    (reservation: any) => {
      const total = reservation.articles.reduce(
        (sum: number, article: any) => sum + (article.product?.price ?? 0),
        0
      );
      const isTreatedPickup =
        reservation.paymentStatus === "paid" && !reservation.stripeSessionId;

      return (
        reservation.articles.length > 0 &&
        total > 0 &&
        reservation.status !== "pending" &&
        reservation.status !== "ended" &&
        !isTreatedPickup
      );
    }
  );

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
      if (!form.category) {
        setNotice("Choisissez une categorie pour ce produit.");
        return;
      }

      if (editingProductId) {
        await editProduct({
          variables: {
            productId: editingProductId,
            data: {
              name: form.name,
              description: form.description,
              category: form.category,
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
            category: form.category,
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
    setUpdatingStockProductId(product.id);

    try {
      await setProductStock({
        variables: {
          productId: product.id,
          quantity,
        },
      });
      setNotice(`Stock de ${product.name} mis a jour a ${quantity}.`);
      setStockInputs((current) => ({ ...current, [product.id]: String(quantity) }));
    } catch {
      setNotice(
        "Impossible de baisser ce stock : certaines unites sont deja dans des commandes."
      );
    } finally {
      setUpdatingStockProductId(null);
    }
  };

  const startEditingProduct = (product: ProductWithArticles) => {
    setNotice("");
    setEditingProductId(product.id);
    setForm({
      name: product.name ?? "",
      description: product.description ?? "",
      category: product.category ?? "manucure",
      imgUrl: product.imgUrl ?? "",
      price: String(product.price ?? ""),
      stock: String(product.articles?.length ?? 0),
    });
    setImageInputKey((current) => current + 1);
    window.setTimeout(() => {
      productFormRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  };

  const updateOrder = async (
    reservationId: string,
    status: string,
    paymentStatus: string,
    shippingCarrier = "",
    trackingNumber = ""
  ) => {
    setNotice("");
    setUpdatingOrderId(reservationId);
    try {
      await updateReservationAdmin({
        variables: {
          reservationId,
          status,
          paymentStatus,
          shippingCarrier,
          trackingNumber,
        },
      });
      setNotice("Commande mise a jour.");
      setOrderDrafts((currentDrafts) => {
        const nextDrafts = { ...currentDrafts };
        delete nextDrafts[reservationId];
        return nextDrafts;
      });
    } catch {
      setNotice("Impossible de modifier cette commande.");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const getOrderDraft = (reservation: any): OrderDraft =>
    orderDrafts[reservation.id] ?? {
      status: reservation.status,
      paymentStatus: reservation.paymentStatus,
      shippingCarrier: reservation.shippingCarrier || "",
      trackingNumber: reservation.trackingNumber || "",
    };

  const changeOrderDraft = (
    reservation: any,
    field: keyof OrderDraft,
    value: string
  ) => {
    const currentDraft = getOrderDraft(reservation);
    setOrderDrafts((currentDrafts) => ({
      ...currentDrafts,
      [reservation.id]: {
        ...currentDraft,
        [field]: value,
      },
    }));
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
          <Link href="/admin-commandes-traitees">Commandes traitees</Link>
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
          <strong>{reservations.length} a traiter</strong>
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
            const productLines = groupArticlesByProduct(reservation.articles);
            const isOnlinePaid =
              reservation.paymentMethod === "card" &&
              reservation.paymentStatus === "paid" &&
              Boolean(reservation.stripeSessionId);
            const hasOnlinePaymentIntent =
              reservation.paymentMethod === "card" &&
              Boolean(reservation.stripeSessionId);
            const paymentModeLabel = isOnlinePaid ? "Paiement confirme" : "Sur place";
            const paymentModeClass = isOnlinePaid
              ? "payment-pill"
              : "payment-pill payment-pill-store";
            const deliveryModeLabel =
              deliveryLabels[reservation.deliveryMethod || "home"] ||
              "Livraison a domicile";
            const isShippableOrder =
              isOnlinePaid && reservation.deliveryMethod !== "store";
            const orderDraft = getOrderDraft(reservation);

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
                  <p>Mode : {deliveryModeLabel}</p>
                  {reservation.deliveryMethod === "relay" && (
                    <p>
                      Relais : {reservation.relayName || "non renseigne"} -{" "}
                      {reservation.relayAddress || "adresse non renseignee"}
                    </p>
                  )}
                  {reservation.deliveryMethod === "store" && (
                    <p>
                      Retrait :{" "}
                      {reservation.pickupDate
                        ? `${new Date(reservation.pickupDate).toLocaleDateString(
                            "fr-FR"
                          )}${reservation.pickupTime ? ` a ${reservation.pickupTime}` : ""}`
                        : "date non renseignee"}
                    </p>
                  )}
                  {reservation.paymentMethod !== "card" && (
                    <p>
                      Retrait :{" "}
                      {reservation.pickupDate
                        ? `${new Date(reservation.pickupDate).toLocaleDateString(
                            "fr-FR"
                          )}${reservation.pickupTime ? ` a ${reservation.pickupTime}` : ""}`
                        : "date non renseignee"}
                    </p>
                  )}
                </div>
                <div className="order-products">
                  <span className="admin-mini-label">Produits commandes</span>
                  <p>
                    {reservation.articles.length} produit(s),{" "}
                    {productLines.length} reference(s) - {formatPrice(total)}
                  </p>
                  <ul>
                    {productLines.map((line) => (
                      <li key={line.productKey}>
                        <img
                          src={line.product?.imgUrl}
                          alt={line.product?.name}
                        />
                        <span>{line.product?.name}</span>
                        <span className="order-product-quantity">
                          x{line.quantity}
                        </span>
                        <strong>{formatPrice(line.total)}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="order-statuses">
                  <span className="admin-mini-label">Gestion</span>
                  <label>
                    Statut commande
                    <select
                      value={orderDraft.status}
                      onChange={(event) =>
                        changeOrderDraft(reservation, "status", event.target.value)
                      }
                    >
                      <option value="pending">Booking - reservation</option>
                      <option value="submitted">Commande recue</option>
                      <option value="validated">Validee par admin</option>
                      <option value="ongoing">Preparation</option>
                      <option value="shipped" disabled={!isShippableOrder}>
                        En cours de livraison
                        {!isShippableOrder ? " - livraison uniquement" : ""}
                      </option>
                      <option value="ended">Terminee</option>
                    </select>
                  </label>
                  <label>
                    Paiement
                    <select
                      value={orderDraft.paymentStatus}
                      onChange={(event) =>
                        changeOrderDraft(
                          reservation,
                          "paymentStatus",
                          event.target.value
                        )
                      }
                    >
                      <option value="pending">pending - a payer</option>
                      <option value="paid">
                        {hasOnlinePaymentIntent
                          ? "paid - paye"
                          : "paid - paye et retire sur place"}
                      </option>
                    </select>
                  </label>

                  {isShippableOrder ? (
                    <>
                      <label>
                        Transporteur
                        <select
                          value={orderDraft.shippingCarrier}
                          onChange={(event) =>
                            changeOrderDraft(
                              reservation,
                              "shippingCarrier",
                              event.target.value
                            )
                          }
                        >
                          <option value="">A definir</option>
                          <option value="La Poste">La Poste</option>
                          <option value="Colissimo">Colissimo</option>
                          <option value="Chronopost">Chronopost</option>
                          <option value="Mondial Relay">Mondial Relay</option>
                          <option value="DHL">DHL</option>
                          <option value="UPS">UPS</option>
                          <option value="Express">Express</option>
                        </select>
                      </label>
                      <label>
                        Numero de suivi
                        <input
                          value={orderDraft.trackingNumber}
                          placeholder="Ex: 8N12345678901"
                          onChange={(event) =>
                            changeOrderDraft(
                              reservation,
                              "trackingNumber",
                              event.target.value
                            )
                          }
                        />
                      </label>
                    </>
                  ) : null}

                  {isShippableOrder &&
                    (reservation.shippingCarrier || reservation.trackingNumber) && (
                    <p className="admin-tracking-summary">
                      {reservation.shippingCarrier || "Transporteur a definir"} -{" "}
                      {reservation.trackingNumber || "numero a renseigner"}
                    </p>
                  )}
                  <span className={`status-pill ${paymentModeClass}`}>
                    {paymentModeLabel}
                  </span>
                  <button
                    type="button"
                    className="save-order-button"
                    disabled={updatingOrderId === reservation.id}
                    onClick={() =>
                      updateOrder(
                        reservation.id,
                        !hasOnlinePaymentIntent &&
                          orderDraft.paymentStatus === "paid"
                          ? "ended"
                          : orderDraft.status,
                        orderDraft.paymentStatus,
                        isShippableOrder ? orderDraft.shippingCarrier : "",
                        isShippableOrder ? orderDraft.trackingNumber : ""
                      )
                    }
                  >
                    {updatingOrderId === reservation.id
                      ? "Enregistrement..."
                      : "Enregistrer les modifications"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="admin-layout" id="gestion-produits">
        <form className="admin-form" onSubmit={submitProduct} ref={productFormRef}>
          <h2>{editingProductId ? "Modifier le produit" : "Nouveau produit"}</h2>
          {editingProductId && (
            <p className="admin-editing-note">
              Produit en modification : validez le formulaire pour enregistrer.
            </p>
          )}
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
            Description du produit
            <textarea
              required
              value={form.description}
              onChange={(event) =>
                handleChange("description", event.target.value)
              }
            />
          </label>
          <label>
            Categorie
            <select
              required
              value={form.category}
              onChange={(event) => handleChange("category", event.target.value)}
            >
              <option value="" disabled>
                Choisir une categorie
              </option>
              {productCategories.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
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
          <button type="submit" disabled={creating || editing}>
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
                  <p className="admin-product-description">{product.description}</p>
                  <span className="product-category-pill">
                    {categoryLabels[product.category || ""] || "Categorie non definie"}
                  </span>
                  <p>{formatPrice(product.price)}</p>
                  <p className="stock-count">
                    Stock actuel : <strong>{product.articles?.length ?? 0}</strong>
                  </p>
                </div>
                <div className="stock-actions-panel">
                  <div className="stock-editor">
                    <label>
                      Stock souhaite
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
                      className="stock-update-button"
                      style={{ color: "#ffffff" }}
                      disabled={updatingStockProductId === product.id}
                      onClick={() => updateProductStock(product)}
                    >
                      {updatingStockProductId === product.id
                        ? "Mise a jour..."
                        : "Mettre a jour le stock"}
                    </button>
                  </div>
                  <div className="admin-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => startEditingProduct(product)}
                    >
                      Modifier ce produit
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
