export const defaultProductImage =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 900 900'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' x2='1' y1='0' y2='1'%3E%3Cstop stop-color='%23f7c8d7'/%3E%3Cstop offset='1' stop-color='%238b4a62'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='900' height='900' fill='url(%23g)'/%3E%3Ccircle cx='450' cy='345' r='145' fill='%23fff7fb' opacity='.9'/%3E%3Cpath d='M290 610c46-82 108-123 186-123 74 0 130 41 169 123' fill='none' stroke='%23fff7fb' stroke-width='46' stroke-linecap='round'/%3E%3Ctext x='450' y='735' text-anchor='middle' font-family='Arial, Helvetica, sans-serif' font-size='56' font-weight='700' fill='%23fff7fb'%3EBeautyPlace%3C/text%3E%3Ctext x='450' y='800' text-anchor='middle' font-family='Arial, Helvetica, sans-serif' font-size='34' fill='%23fff7fb'%3EProduit%3C/text%3E%3C/svg%3E";

const productImageFallbacks: Record<string, string> = {
  serum:
    "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=900&q=80",
  creme:
    "https://images.unsplash.com/photo-1596755389378-c31d21fd1273?auto=format&fit=crop&w=900&q=80",
  palette:
    "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=900&q=80",
  maquillage:
    "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=900&q=80",
  capillaire:
    "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=900&q=80",
  huile:
    "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=900&q=80",
  manucure:
    "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=900&q=80",
  masque:
    "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=900&q=80",
  skincare:
    "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=900&q=80",
  coco:
    "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=900&q=80",
  coconut:
    "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=900&q=80",
};

const isReadableImageSource = (image?: string | null) => {
  const source = image?.trim();

  if (!source) {
    return false;
  }

  if (source.startsWith("data:image/")) {
    return source.length < 160000;
  }

  return source.startsWith("https://") || source.startsWith("http://");
};

const getFallbackByName = (name?: string | null) => {
  const normalizedName = name?.toLowerCase() || "";
  const fallbackKey = Object.keys(productImageFallbacks).find((key) =>
    normalizedName.includes(key)
  );

  return fallbackKey
    ? productImageFallbacks[fallbackKey]
    : defaultProductImage;
};

export const getProductImage = (product?: {
  imgUrl?: string | null;
  name?: string | null;
}) => {
  const image = product?.imgUrl?.trim();

  if (isReadableImageSource(image)) {
    return image;
  }

  return getFallbackByName(product?.name);
};
