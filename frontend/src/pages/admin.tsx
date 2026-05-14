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
  DELETE_RESERVATION_ADMIN,
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
import { defaultProductImage, getProductImage } from "../utils/productImages";

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
  submitted: "commande reçue",
  validated: "validee",
  ongoing: "preparation",
  shipped: "en cours de livraison",
  ended: "terminee",
};

const paymentLabels: Record<string, string> = {
  pending: "a payer",
  paid: "payé",
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
    const existingGroup = groups.find(
      (group) => group.productKey === productKey
    );

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

const getStockCount = (product: ProductWithArticles) =>
  product.stockCount ?? product.articles?.length ?? 0;

const getOrderedArticles = (reservation: any) => {
  if (reservation.articles?.length) {
    return reservation.articles.map((article: any) => ({
      ...article,
      product: {
        ...article.product,
        imgUrl: getProductImage(article.product),
      },
    }));
  }

  if (!reservation.articlesSnapshot) {
    return [];
  }

  try {
    const snapshot = JSON.parse(reservation.articlesSnapshot);

    if (!Array.isArray(snapshot)) {
      return [];
    }

    return snapshot.map((item: any, index: number) => ({
      id: item.articleId || `${item.productId || "snapshot"}-${index}`,
      product: {
        id: item.productId || item.articleId || `snapshot-${index}`,
        name: item.name || "Produit BeautyPlace",
        price: Number(item.price) || 0,
        imgUrl: getProductImage({
          imgUrl: item.imgUrl,
          name: item.name,
        }),
      },
    }));
  } catch {
    return [];
  }
};

function AdminContent() {
  const [form, setForm] = useState<ProductForm>(emptyProduct);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [formErrorPopup, setFormErrorPopup] = useState<{
    title: string;
    message: string;
  } | null>(null);
  const [imageInputKey, setImageInputKey] = useState(0);
  const [stockInputs, setStockInputs] = useState<Record<string, string>>({});
  const [orderDrafts, setOrderDrafts] = useState<Record<string, OrderDraft>>(
    {}
  );
  const [orderFeedbacks, setOrderFeedbacks] = useState<
    Record<string, { type: "success" | "error"; message: string }>
  >({});
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [updatingStockProductId, setUpdatingStockProductId] = useState<
    string | null
  >(null);
  const productFormRef = useRef<HTMLFormElement | null>(null);
  const { data, loading, error } = useQuery(GET_ALL_PRODUCTS);
  const {
    data: reservationsData,
    loading: loadingReservations,
    error: reservationsError,
  } = useQuery(GET_ALL_RESERVATIONS, {
    fetchPolicy: "network-only",
  });
  const [createProduct, { loading: creating }] = useMutation(
    CREATE_NEW_PRODUCT,
    {
      refetchQueries: [{ query: GET_ALL_PRODUCTS }],
    }
  );
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
  const [deleteReservationAdmin, { loading: deletingReservation }] =
    useMutation(DELETE_RESERVATION_ADMIN, {
      refetchQueries: [{ query: GET_ALL_RESERVATIONS }],
    });

  const products = useMemo<ProductWithArticles[]>(
    () => data?.getAllProducts ?? [],
    [data]
  );

  const reservations = (reservationsData?.getAllReservations ?? []).filter(
    (reservation: any) => {
      const orderedArticles = getOrderedArticles(reservation);
      const total = orderedArticles.reduce(
        (sum: number, article: any) => sum + (article.product?.price ?? 0),
        0
      );

      return (
        reservation.status !== "ended" &&
        reservation.paymentMethod === "card" &&
        reservation.paymentStatus === "paid" &&
        Boolean(reservation.stripeSessionId) &&
        Boolean(reservation.stripePaymentConfirmedAt) &&
        orderedArticles.length > 0 &&
        total > 0
      );
    }
  );

  useEffect(() => {
    setStockInputs((current) => {
      const next = { ...current };
      products.forEach((product) => {
        if (next[product.id] === undefined) {
          next[product.id] = String(getStockCount(product));
        }
      });
      return next;
    });
  }, [products]);

  const handleChange = (field: keyof ProductForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetProductForm = () => {
    setForm(emptyProduct);
    setEditingProductId(null);
    setFormErrorPopup(null);
    setImageInputKey((current) => current + 1);
  };

  const showRequiredFieldError = (message: string) => {
    setNotice(message);
    setFormErrorPopup({
      title: "Champ obligatoire",
      message,
    });
  };

  const validateProductForm = () => {
    if (!form.name.trim()) {
      return "Ajoutez le nom du produit.";
    }

    if (form.name.trim().length < 10) {
      return "Le nom du produit doit contenir au moins 10 caracteres.";
    }

    if (!form.description.trim()) {
      return "Ajoutez une description du produit.";
    }

    if (!form.category) {
      return "Choisissez une categorie pour ce produit.";
    }

    if (!form.imgUrl.trim()) {
      return "Ajoutez une image avant d'enregistrer ce produit.";
    }

    if (!form.price.trim()) {
      return "Ajoutez le prix du produit.";
    }

    if (Number(form.price) <= 0) {
      return "Le prix du produit doit etre superieur a 0.";
    }

    if (!form.stock.trim()) {
      return "Ajoutez le stock souhaite.";
    }

    if (
      Number(form.stock) < 0 ||
      (!editingProductId && Number(form.stock) < 1)
    ) {
      return editingProductId
        ? "Le stock ne peut pas etre negatif."
        : "Le stock doit etre au moins de 1 pour un nouveau produit.";
    }

    return "";
  };

  const submitProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice("");

    try {
      const validationMessage = validateProductForm();
      if (validationMessage) {
        showRequiredFieldError(validationMessage);
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
      setNotice(
        "Impossible d'enregistrer le produit. Verifiez vos droits admin."
      );
    }
  };

  const selectImageFile = (event: ChangeEvent<HTMLInputElement>) => {
    setNotice("");
    setFormErrorPopup(null);
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
      setStockInputs((current) => ({
        ...current,
        [product.id]: String(quantity),
      }));
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
      stock: String(getStockCount(product)),
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
    requiresShippingCarrier = false,
    shippingCarrier = "",
    trackingNumber = ""
  ) => {
    setNotice("");
    setOrderFeedbacks((current) => {
      const next = { ...current };
      delete next[reservationId];
      return next;
    });

    if (requiresShippingCarrier && !shippingCarrier.trim()) {
      const message =
        "Choisissez un transporteur avant d'enregistrer cette commande.";
      setNotice(message);
      setOrderFeedbacks((current) => ({
        ...current,
        [reservationId]: {
          type: "error",
          message,
        },
      }));
      return;
    }

    if (
      requiresShippingCarrier &&
      ["shipped", "ended"].includes(status) &&
      !trackingNumber.trim()
    ) {
      const message =
        "Renseignez le numero de suivi avant d'enregistrer une commande envoyée.";
      setNotice(message);
      setOrderFeedbacks((current) => ({
        ...current,
        [reservationId]: {
          type: "error",
          message,
        },
      }));
      return;
    }

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
      setOrderFeedbacks((current) => ({
        ...current,
        [reservationId]: {
          type: "success",
          message: "Modifications enregistrées avec succès.",
        },
      }));
      setOrderDrafts((currentDrafts) => {
        const nextDrafts = { ...currentDrafts };
        delete nextDrafts[reservationId];
        return nextDrafts;
      });
    } catch (error: any) {
      const errorMessage =
        error?.graphQLErrors?.[0]?.message ||
        error?.networkError?.message ||
        "Impossible de modifier cette commande.";

      setNotice("Impossible de modifier cette commande.");
      setOrderFeedbacks((current) => ({
        ...current,
        [reservationId]: {
          type: "error",
          message: errorMessage,
        },
      }));
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const deleteOrderFromAdmin = async (reservationId: string) => {
    setNotice("");

    try {
      await deleteReservationAdmin({
        variables: {
          reservationId,
        },
      });
      setNotice("Commande supprimee de la liste administrateur.");
      setOrderDrafts((currentDrafts) => {
        const nextDrafts = { ...currentDrafts };
        delete nextDrafts[reservationId];
        return nextDrafts;
      });
    } catch {
      setNotice("Impossible de supprimer cette commande.");
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
          Retrouvez les reservations clients, les produits commandés, les prix
          et la gestion du stock au meme endroit.
        </p>
        <div className="admin-shortcuts">
          <a href="#commandes-clients">Reservations</a>
          <Link href="/admin-messages">Messages</Link>
          <Link href="/admin-commandes-traitees">Commandes traitées</Link>
          <Link href="/admin-produits">Produits</Link>
          <Link href="/admin-nouveau-produit">Nouveau produit</Link>
          <Link href="/inscription-administrateur">Nouvel admin</Link>
        </div>
      </section>

      {notice && <p className="shop-message">{notice}</p>}
      {formErrorPopup && (
        <div
          className="admin-popup-overlay"
          role="alertdialog"
          aria-modal="true"
        >
          <div className="admin-popup">
            <p className="shop-kicker">Formulaire incomplet</p>
            <h2>{formErrorPopup.title}</h2>
            <p>{formErrorPopup.message}</p>
            <button type="button" onClick={() => setFormErrorPopup(null)}>
              J'ai compris
            </button>
          </div>
        </div>
      )}

      <section className="admin-panel admin-orders" id="commandes-clients">
        <div className="admin-section-heading">
          <div>
            <p className="shop-kicker">Commandes</p>
            <h2>Liste des reservations</h2>
          </div>
          <strong>{reservations.length} à traiter</strong>
        </div>
        {loadingReservations && <p>Chargement des commandes...</p>}
        {reservationsError && <p>Impossible de charger les commandes.</p>}
        {!loadingReservations && !reservations.length && (
          <p>Aucune commande client pour le moment.</p>
        )}
        <div className="orders-table">
          {reservations.map((reservation: any) => {
            const orderedArticles = getOrderedArticles(reservation);
            const total = orderedArticles.reduce(
              (sum: number, article: any) =>
                sum + (article.product?.price ?? 0),
              0
            );
            const productLines = groupArticlesByProduct(orderedArticles);
            const isOnlinePaid =
              reservation.paymentMethod === "card" &&
              reservation.paymentStatus === "paid" &&
              Boolean(reservation.stripeSessionId) &&
              Boolean(reservation.stripePaymentConfirmedAt);
            const hasOnlinePaymentIntent =
              reservation.paymentMethod === "card" &&
              Boolean(reservation.stripeSessionId);
            const paymentModeLabel = isOnlinePaid
              ? "Paiement confirme"
              : "Sur place";
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
                    <span
                      className={`status-pill status-${reservation.status}`}
                    >
                      {statusLabels[reservation.status] || reservation.status}
                    </span>
                    <span
                      className={`status-pill payment-${reservation.paymentStatus}`}
                    >
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
                        ? `${new Date(
                            reservation.pickupDate
                          ).toLocaleDateString("fr-FR")}${
                            reservation.pickupTime
                              ? ` a ${reservation.pickupTime}`
                              : ""
                          }`
                        : "date non renseignee"}
                    </p>
                  )}
                  {reservation.paymentMethod !== "card" && (
                    <p>
                      Retrait :{" "}
                      {reservation.pickupDate
                        ? `${new Date(
                            reservation.pickupDate
                          ).toLocaleDateString("fr-FR")}${
                            reservation.pickupTime
                              ? ` a ${reservation.pickupTime}`
                              : ""
                          }`
                        : "date non renseignee"}
                    </p>
                  )}
                </div>
                <div className="order-products">
                  <span className="admin-mini-label">Produits commandés</span>
                  <p>
                    {orderedArticles.length} produit(s), {productLines.length}{" "}
                    reference(s) - {formatPrice(total)}
                  </p>
                  <ul>
                    {productLines.length > 0 ? (
                      productLines.map((line) => (
                        <li key={line.productKey}>
                          <img
                            src={getProductImage(line.product)}
                            alt={line.product?.name}
                            onError={(event) => {
                              event.currentTarget.src = defaultProductImage;
                            }}
                          />
                          <span>{line.product?.name}</span>
                          <span className="order-product-quantity">
                            x{line.quantity}
                          </span>
                          <strong>{formatPrice(line.total)}</strong>
                        </li>
                      ))
                    ) : (
                      <li className="order-product-empty">
                        Donnees produit non disponibles dans cette reservation.
                      </li>
                    )}
                  </ul>
                </div>
                <div className="order-statuses">
                  <span className="admin-mini-label">Gestion</span>
                  <label>
                    Statut commande
                    <select
                      value={orderDraft.status}
                      onChange={(event) =>
                        changeOrderDraft(
                          reservation,
                          "status",
                          event.target.value
                        )
                      }
                    >
                      <option value="pending">Booking - reservation</option>
                      <option value="submitted">Commande reçue</option>
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
                          ? "paid - payé"
                          : "paid - payé et retire sur place"}
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
                          <option value="" disabled>
                            Choisir un transporteur
                          </option>
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
                    (reservation.shippingCarrier ||
                      reservation.trackingNumber) && (
                      <p className="admin-tracking-summary">
                        {reservation.shippingCarrier || "Transporteur requis"} -{" "}
                        {reservation.trackingNumber || "numéro à renseigner"}
                      </p>
                    )}
                  <span className={`status-pill ${paymentModeClass}`}>
                    {paymentModeLabel}
                  </span>
                  {orderFeedbacks[reservation.id] && (
                    <p
                      className={`order-feedback order-feedback-${
                        orderFeedbacks[reservation.id].type
                      }`}
                    >
                      {orderFeedbacks[reservation.id].message}
                    </p>
                  )}
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
                        isShippableOrder,
                        isShippableOrder ? orderDraft.shippingCarrier : "",
                        isShippableOrder ? orderDraft.trackingNumber : ""
                      )
                    }
                  >
                    {updatingOrderId === reservation.id
                      ? "Enregistrement..."
                      : "Enregistrer les modifications"}
                  </button>
                  <button
                    type="button"
                    className="danger-button"
                    disabled={deletingReservation}
                    onClick={() => deleteOrderFromAdmin(reservation.id)}
                  >
                    Supprimer cette commande
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section
        className={
          editingProductId ? "admin-layout" : "admin-layout admin-products-only"
        }
        id="gestion-produits"
      >
        {editingProductId ? (
          <form
            className="admin-form"
            onSubmit={submitProduct}
            ref={productFormRef}
            noValidate
          >
            <h2>Modifier le produit</h2>
            <p className="admin-editing-note">
              Produit en modification : validez le formulaire pour enregistrer.
            </p>
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
                onChange={(event) =>
                  handleChange("category", event.target.value)
                }
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
              <span className="form-help-text">
                Image obligatoire pour publier le produit.
              </span>
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
              Enregistrer les modifications
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={resetProductForm}
            >
              Annuler
            </button>
          </form>
        ) : null}

        <section className="admin-panel">
          <div className="admin-section-heading compact">
            <div>
              <p className="shop-kicker">Catalogue</p>
              <h2>Liste des produits</h2>
            </div>
            <div className="admin-heading-actions">
              <strong>{products.length} produit(s)</strong>
              <Link className="secondary-button" href="/admin-nouveau-produit">
                Nouveau produit
              </Link>
            </div>
          </div>
          {loading && <p>Chargement...</p>}
          {error && <p>Impossible de charger les produits.</p>}
          <div className="admin-product-list">
            {products.map((product) => (
              <article className="admin-product" key={product.id}>
                <img
                  src={getProductImage(product)}
                  alt={product.name}
                  onError={(event) => {
                    event.currentTarget.src = defaultProductImage;
                  }}
                />
                <div>
                  <h3>{product.name}</h3>
                  <p className="admin-product-description">
                    {product.description}
                  </p>
                  <span className="product-category-pill">
                    {categoryLabels[product.category || ""] ||
                      "Categorie non definie"}
                  </span>
                  <p>{formatPrice(product.price)}</p>
                  <p className="stock-count">
                    Stock actuel : <strong>{getStockCount(product)}</strong>
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
                        value={
                          stockInputs[product.id] ?? getStockCount(product)
                        }
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
                        deleteProduct({
                          variables: { deleteProductId: product.id },
                        })
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
  const isAdmin = data?.whoAmI?.isLoggedIn && data?.whoAmI?.role === Role.Admin;

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
