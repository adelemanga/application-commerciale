import { ApolloProvider, useMutation, useQuery } from "@apollo/client";
import Link from "next/link";
import { useRouter } from "next/router";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import client from "../graphql/client";
import { CREATE_NEW_ARTICLE, CREATE_NEW_PRODUCT } from "../graphql/mutations";
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

const getStockCount = (product: ProductWithArticles) =>
  product.stockCount ?? product.articles?.length ?? 0;

function NewProductContent() {
  const router = useRouter();
  const [form, setForm] = useState<ProductForm>(emptyProduct);
  const [notice, setNotice] = useState("");
  const [formErrorPopup, setFormErrorPopup] = useState<{
    title: string;
    message: string;
  } | null>(null);
  const [imageInputKey, setImageInputKey] = useState(0);
  const { data: userData, loading: loadingUser } = useQuery(WHO_AM_I, {
    fetchPolicy: "network-only",
  });
  const {
    data: productsData,
    loading: loadingProducts,
    error: productsError,
  } = useQuery(GET_ALL_PRODUCTS, {
    fetchPolicy: "cache-and-network",
  });
  const [createProduct, { loading: creating }] = useMutation(CREATE_NEW_PRODUCT, {
    refetchQueries: [{ query: GET_ALL_PRODUCTS }],
  });
  const [createArticle] = useMutation(CREATE_NEW_ARTICLE, {
    refetchQueries: [{ query: GET_ALL_PRODUCTS }],
  });

  const user = userData?.whoAmI;
  const products = useMemo<ProductWithArticles[]>(
    () => productsData?.getAllProducts ?? [],
    [productsData?.getAllProducts]
  );

  useEffect(() => {
    if (!loadingUser && (!user?.isLoggedIn || user.role !== Role.Admin)) {
      router.replace("/connexion-administrateur");
    }
  }, [loadingUser, router, user]);

  const handleChange = (field: keyof ProductForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetProductForm = () => {
    setForm(emptyProduct);
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
    if (!form.name.trim()) return "Ajoutez le nom du produit.";
    if (form.name.trim().length < 10) {
      return "Le nom du produit doit contenir au moins 10 caracteres.";
    }
    if (!form.description.trim()) return "Ajoutez une description du produit.";
    if (!form.category) return "Choisissez une categorie pour ce produit.";
    if (!form.imgUrl.trim()) {
      return "Ajoutez une image avant d'enregistrer ce produit.";
    }
    if (!form.price.trim()) return "Ajoutez le prix du produit.";
    if (Number(form.price) <= 0) {
      return "Le prix du produit doit etre superieur a 0.";
    }
    if (!form.stock.trim()) return "Ajoutez le stock souhaite.";
    if (Number(form.stock) < 1) {
      return "Le stock doit etre au moins de 1 pour un nouveau produit.";
    }

    return "";
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
      showRequiredFieldError("Selectionnez un fichier image valide.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        handleChange("imgUrl", reader.result);
      }
    };
    reader.onerror = () => {
      showRequiredFieldError("Impossible de lire cette image.");
    };
    reader.readAsDataURL(file);
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

      const productResult = await createProduct({
        variables: {
          data: {
            name: form.name.trim(),
            description: form.description.trim(),
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
        <h1>Nouveau produit</h1>
        <p>
          Ajoutez un produit BeautyPlace avec son image, sa categorie, son prix
          et son stock initial.
        </p>
        <div className="admin-shortcuts">
          <Link href="/admin-produits">Liste des produits</Link>
          <Link href="/admin#commandes-clients">Reservations</Link>
          <Link href="/admin-commandes-traitees">Commandes traitées</Link>
        </div>
      </section>

      {notice && <p className="shop-message">{notice}</p>}
      {formErrorPopup && (
        <div className="admin-popup-overlay" role="alertdialog" aria-modal="true">
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

      <section className="admin-layout">
        <form className="admin-form" onSubmit={submitProduct} noValidate>
          <h2>Creer un produit</h2>
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
            Stock initial
            <input
              required
              type="number"
              min="1"
              step="1"
              value={form.stock}
              onChange={(event) => handleChange("stock", event.target.value)}
            />
          </label>
          <button type="submit" disabled={creating}>
            {creating ? "Ajout en cours..." : "Ajouter le produit"}
          </button>
          <button type="button" className="secondary-button" onClick={resetProductForm}>
            Vider le formulaire
          </button>
        </form>
        <section className="admin-panel">
          <div className="admin-section-heading compact">
            <div>
              <p className="shop-kicker">Catalogue</p>
              <h2>Liste des produits</h2>
            </div>
            <div className="admin-heading-actions">
              <strong>{products.length} produit(s)</strong>
              <Link className="secondary-button" href="/admin-produits">
                Gerer le catalogue
              </Link>
            </div>
          </div>
          {loadingProducts && <p>Chargement des produits...</p>}
          {productsError && <p>Impossible de charger les produits.</p>}
          <div className="new-product-catalog-list">
            {products.map((product) => (
              <article className="new-product-catalog-card" key={product.id}>
                <img
                  src={getProductImage(product)}
                  alt={product.name}
                  onError={(event) => {
                    event.currentTarget.src = defaultProductImage;
                  }}
                />
                <div>
                  <h3>{product.name}</h3>
                  <p>{product.description}</p>
                  <div className="new-product-catalog-meta">
                    <span className="product-category-pill">
                      {categoryLabels[product.category || ""] ||
                        "Categorie non definie"}
                    </span>
                    <strong>{formatPrice(product.price)}</strong>
                    <span>Stock : {getStockCount(product)}</span>
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

export default function NewProductPage() {
  return (
    <ApolloProvider client={client}>
      <Header />
      <NewProductContent />
      <Footer />
    </ApolloProvider>
  );
}
