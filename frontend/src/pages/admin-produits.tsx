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
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import client from "../graphql/client";
import { DELETE_PRODUCT, EDIT_PRODUCT, SET_PRODUCT_STOCK } from "../graphql/mutations";
import { GET_ALL_PRODUCTS, WHO_AM_I } from "../graphql/queries";
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

const getStockCount = (product: ProductWithArticles) =>
  product.stockCount ?? product.articles?.length ?? 0;

function AdminProductsContent() {
  const router = useRouter();
  const [notice, setNotice] = useState("");
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>({
    name: "",
    description: "",
    category: "",
    imgUrl: "",
    price: "",
    stock: "0",
  });
  const [imageInputKey, setImageInputKey] = useState(0);
  const [stockInputs, setStockInputs] = useState<Record<string, string>>({});
  const [stockFeedbacks, setStockFeedbacks] = useState<
    Record<string, { type: "success" | "error"; message: string }>
  >({});
  const [updatingStockProductId, setUpdatingStockProductId] = useState<string | null>(
    null
  );
  const editFormRef = useRef<HTMLFormElement | null>(null);
  const { data: userData, loading: loadingUser } = useQuery(WHO_AM_I, {
    fetchPolicy: "network-only",
  });
  const { data, loading, error } = useQuery(GET_ALL_PRODUCTS, {
    fetchPolicy: "cache-and-network",
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

  const user = userData?.whoAmI;
  const products = useMemo<ProductWithArticles[]>(
    () => data?.getAllProducts ?? [],
    [data?.getAllProducts]
  );

  useEffect(() => {
    if (!loadingUser && (!user?.isLoggedIn || user.role !== Role.Admin)) {
      router.replace("/connexion-administrateur");
    }
  }, [loadingUser, router, user]);

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

  const resetEditForm = () => {
    setEditingProductId(null);
    setForm({
      name: "",
      description: "",
      category: "",
      imgUrl: "",
      price: "",
      stock: "0",
    });
    setImageInputKey((current) => current + 1);
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
    reader.onerror = () => setNotice("Impossible de lire cette image.");
    reader.readAsDataURL(file);
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
      editFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const validateEditForm = () => {
    if (!form.name.trim()) return "Ajoutez le nom du produit.";
    if (form.name.trim().length < 10) {
      return "Le nom du produit doit contenir au moins 10 caracteres.";
    }
    if (!form.description.trim()) return "Ajoutez une description du produit.";
    if (!form.category) return "Choisissez une categorie pour ce produit.";
    if (!form.imgUrl.trim()) return "Ajoutez une image avant d'enregistrer ce produit.";
    if (!form.price.trim() || Number(form.price) <= 0) {
      return "Le prix du produit doit etre superieur a 0.";
    }
    if (!form.stock.trim() || Number(form.stock) < 0) {
      return "Le stock ne peut pas etre negatif.";
    }
    return "";
  };

  const submitEditProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice("");

    const validationMessage = validateEditForm();
    if (validationMessage) {
      setNotice(validationMessage);
      return;
    }

    if (!editingProductId) return;

    try {
      await editProduct({
        variables: {
          productId: editingProductId,
          data: {
            name: form.name.trim(),
            description: form.description.trim(),
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
      setNotice("Produit modifie.");
      resetEditForm();
    } catch {
      setNotice("Impossible de modifier ce produit.");
    }
  };

  const changeStockInput = (productId: string, value: string) => {
    setStockInputs((current) => ({ ...current, [productId]: value }));
  };

  const updateProductStock = async (product: ProductWithArticles) => {
    setNotice("");
    setStockFeedbacks((current) => {
      const next = { ...current };
      delete next[product.id];
      return next;
    });
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
      setStockFeedbacks((current) => ({
        ...current,
        [product.id]: {
          type: "success",
          message: `Stock mis a jour a ${quantity}.`,
        },
      }));
      setStockInputs((current) => ({ ...current, [product.id]: String(quantity) }));
    } catch (error: any) {
      const errorMessage =
        error?.graphQLErrors?.[0]?.message ||
        "Impossible de baisser ce stock : certaines unites sont deja dans des commandes."
      setNotice(errorMessage);
      setStockFeedbacks((current) => ({
        ...current,
        [product.id]: {
          type: "error",
          message: errorMessage,
        },
      }));
    } finally {
      setUpdatingStockProductId(null);
    }
  };

  if (loadingUser || !user?.isLoggedIn || user.role !== Role.Admin) {
    return (
      <main className="admin-page">
        <section className="admin-hero">
          <p className="shop-kicker">Administration</p>
          <h1>Verification admin</h1>
          <p>Chargement de votre acces administrateur...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <section className="admin-hero">
        <p className="shop-kicker">Catalogue</p>
        <h1>Liste des produits</h1>
        <p>
          Retrouvez tous les produits BeautyPlace avec leurs images, categories,
          prix, descriptions et stocks.
        </p>
        <div className="admin-shortcuts">
          <Link href="/admin-nouveau-produit">Nouveau produit</Link>
          <Link href="/admin#commandes-clients">Reservations</Link>
          <Link href="/admin-commandes-traitees">Commandes traitées</Link>
        </div>
      </section>

      {notice && <p className="shop-message">{notice}</p>}

      <section
        className={
          editingProductId ? "admin-layout" : "admin-layout admin-products-only"
        }
      >
        {editingProductId && (
          <form
            className="admin-form"
            onSubmit={submitEditProduct}
            ref={editFormRef}
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
                min="0.01"
                step="0.01"
                value={form.price}
                onChange={(event) => handleChange("price", event.target.value)}
              />
            </label>
            <label>
              Stock souhaite
              <input
                required
                type="number"
                min="0"
                step="1"
                value={form.stock}
                onChange={(event) => handleChange("stock", event.target.value)}
              />
            </label>
            <button type="submit" disabled={editing}>
              {editing ? "Enregistrement..." : "Enregistrer les modifications"}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={resetEditForm}
            >
              Annuler
            </button>
          </form>
        )}

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
                        value={stockInputs[product.id] ?? getStockCount(product)}
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
                    {stockFeedbacks[product.id] && (
                      <p
                        className={`stock-feedback stock-feedback-${stockFeedbacks[product.id].type}`}
                      >
                        {stockFeedbacks[product.id].message}
                      </p>
                    )}
                  </div>
                  <div className="admin-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => startEditingProduct(product)}
                    >
                      Modifier ce produit
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

export default function AdminProductsPage() {
  return (
    <ApolloProvider client={client}>
      <Header />
      <AdminProductsContent />
      <Footer />
    </ApolloProvider>
  );
}
