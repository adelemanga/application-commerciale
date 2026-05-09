import { ChangeEvent, useEffect, useMemo, useState } from "react";

type AddressFeature = {
  properties: {
    label: string;
    name?: string;
    housenumber?: string;
    street?: string;
    postcode?: string;
    city?: string;
  };
};

type CityResult = {
  nom: string;
  codesPostaux?: string[];
  departement?: { nom: string; code: string };
  region?: { nom: string; code: string };
};

type AreaResult = {
  nom: string;
  code: string;
  region?: { nom: string; code: string };
};

type AddressSuggestion = {
  id: string;
  label: string;
  detail: string;
  value: string;
  kind: "address" | "city" | "department" | "region";
  properties?: AddressFeature["properties"];
};

type AddressAutocompleteProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  name?: string;
  placeholder?: string;
  required?: boolean;
};

export default function AddressAutocomplete({
  label,
  value,
  onChange,
  name = "address",
  placeholder = "Rechercher par region, ville, code postal ou adresse",
  required = false,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [selectedAddress, setSelectedAddress] =
    useState<AddressSuggestion | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const search = value.trim();

    if (search.length < 3) {
      setSuggestions([]);
      return;
    }

    const timeout = window.setTimeout(async () => {
      setIsSearching(true);

      try {
        const [addressResponse, cityResponse, departmentResponse, regionResponse] =
          await Promise.all([
            fetch(
              `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(
                search
              )}&limit=7&autocomplete=1`
            ),
            fetch(
              `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(
                search
              )}&fields=nom,codesPostaux,departement,region&boost=population&limit=4`
            ),
            fetch(
              `https://geo.api.gouv.fr/departements?nom=${encodeURIComponent(
                search
              )}&fields=nom,code,region&limit=3`
            ),
            fetch(
              `https://geo.api.gouv.fr/regions?nom=${encodeURIComponent(
                search
              )}&fields=nom,code&limit=3`
            ),
          ]);

        const [addressData, cityData, departmentData, regionData] =
          await Promise.all([
            addressResponse.json(),
            cityResponse.json(),
            departmentResponse.json(),
            regionResponse.json(),
          ]);

        const addressSuggestions: AddressSuggestion[] = (
          addressData.features ?? []
        ).map((feature: AddressFeature) => ({
          id: `address-${feature.properties.label}`,
          label: feature.properties.label,
          detail: `${feature.properties.postcode ?? ""} ${
            feature.properties.city ?? ""
          }`.trim(),
          value: feature.properties.label,
          kind: "address",
          properties: feature.properties,
        }));

        const citySuggestions: AddressSuggestion[] = (cityData ?? []).map(
          (city: CityResult) => {
            const postalCode = city.codesPostaux?.[0] ?? "";
            const label = `${city.nom}${postalCode ? ` (${postalCode})` : ""}`;

            return {
              id: `city-${city.nom}-${postalCode}`,
              label,
              detail: [
                "Ville",
                city.departement?.nom,
                city.region?.nom,
              ]
                .filter(Boolean)
                .join(" - "),
              value: `${postalCode} ${city.nom}`.trim(),
              kind: "city",
            };
          }
        );

        const departmentSuggestions: AddressSuggestion[] = (
          departmentData ?? []
        ).map((department: AreaResult) => ({
          id: `department-${department.code}`,
          label: `${department.nom} (${department.code})`,
          detail: ["Departement", department.region?.nom]
            .filter(Boolean)
            .join(" - "),
          value: department.nom,
          kind: "department",
        }));

        const regionSuggestions: AddressSuggestion[] = (regionData ?? []).map(
          (region: AreaResult) => ({
            id: `region-${region.code}`,
            label: region.nom,
            detail: "Region",
            value: region.nom,
            kind: "region",
          })
        );

        setSuggestions([
          ...addressSuggestions,
          ...citySuggestions,
          ...departmentSuggestions,
          ...regionSuggestions,
        ]);
      } catch {
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [value]);

  const selectedDetails = useMemo(() => {
    if (!selectedAddress) {
      return null;
    }

    if (!selectedAddress.properties) {
      return [
        selectedAddress.kind === "city"
          ? "Ville selectionnee : ajoutez le numero et la rue si necessaire."
          : "Zone selectionnee : precisez la ville, le numero et la rue pour la livraison.",
      ];
    }

    const { properties } = selectedAddress;

    return [
      properties.housenumber && `Numero : ${properties.housenumber}`,
      (properties.street || properties.name) &&
        `Rue : ${properties.street || properties.name}`,
      properties.postcode && `Code postal : ${properties.postcode}`,
      properties.city && `Ville : ${properties.city}`,
    ].filter((detail): detail is string => Boolean(detail));
  }, [selectedAddress]);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSelectedAddress(null);
    onChange(event.target.value);
  };

  const selectAddress = (address: AddressSuggestion) => {
    setSelectedAddress(address);
    onChange(address.value);
    setSuggestions([]);
  };

  return (
    <label className="address-autocomplete-field">
      {label}
      <input
        required={required}
        name={name}
        autoComplete="street-address"
        placeholder={placeholder}
        value={value}
        onChange={handleInputChange}
      />
      <span className="address-search-hint">
        France entiere : region, departement, ville, code postal, rue ou numero.
      </span>
      {isSearching && <span className="address-search-status">Recherche...</span>}
      {suggestions.length > 0 && (
        <div className="address-suggestions">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => selectAddress(suggestion)}
            >
              <strong>{suggestion.label}</strong>
              <span>{suggestion.detail}</span>
            </button>
          ))}
        </div>
      )}
      {selectedDetails && (
        <div className="address-selected-details">
          {selectedDetails.map((detail) => (
            <span key={detail}>{detail}</span>
          ))}
        </div>
      )}
    </label>
  );
}
