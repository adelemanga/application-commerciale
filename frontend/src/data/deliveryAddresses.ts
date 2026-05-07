export type DeliveryCity = {
  name: string;
  postalCode: string;
  streets: string[];
};

export const deliveryCities: DeliveryCity[] = [
  {
    name: "Paris",
    postalCode: "75008",
    streets: [
      "Avenue des Champs-Elysees",
      "Rue du Faubourg Saint-Honore",
      "Boulevard Haussmann",
    ],
  },
  {
    name: "Boulogne-Billancourt",
    postalCode: "92100",
    streets: ["Avenue Jean Baptiste Clement", "Route de la Reine", "Rue de Billancourt"],
  },
  {
    name: "Saint-Denis",
    postalCode: "93200",
    streets: ["Rue de la Republique", "Boulevard Marcel Sembat", "Avenue Paul Vaillant Couturier"],
  },
  {
    name: "Montreuil",
    postalCode: "93100",
    streets: ["Rue de Paris", "Boulevard Rouget de Lisle", "Avenue Pasteur"],
  },
  {
    name: "Creteil",
    postalCode: "94000",
    streets: ["Avenue du General de Gaulle", "Rue Juliette Savar", "Avenue Pierre Brossolette"],
  },
  {
    name: "Nanterre",
    postalCode: "92000",
    streets: ["Avenue Georges Clemenceau", "Rue de Stalingrad", "Boulevard du Couchant"],
  },
];

export const getDeliveryAddress = (
  street: string,
  cityName: string,
  complement?: string
) => {
  const city = deliveryCities.find((item) => item.name === cityName);
  const fullAddress = [street, complement, city ? `${city.postalCode} ${city.name}` : cityName]
    .filter(Boolean)
    .join(", ");

  return fullAddress;
};
