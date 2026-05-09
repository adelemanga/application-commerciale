import { useEffect, useId, useState } from "react";

type MondialRelayData = {
  ID?: string;
  Nom?: string;
  Adresse1?: string;
  Adresse2?: string;
  CP?: string;
  Ville?: string;
  Pays?: string;
};

type MondialRelayPickerProps = {
  onSelect: (relayName: string, relayAddress: string) => void;
};

declare global {
  interface Window {
    jQuery?: any;
    $?: any;
  }
}

const loadScript = (src: string) =>
  new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${src}"]`
    );

    if (existingScript) {
      if (existingScript.dataset.loaded === "true") {
        resolve();
        return;
      }

      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = reject;
    document.body.appendChild(script);
  });

const loadStyle = (href: string) => {
  if (document.querySelector(`link[href="${href}"]`)) {
    return;
  }

  const style = document.createElement("link");
  style.rel = "stylesheet";
  style.href = href;
  document.head.appendChild(style);
};

const formatRelayAddress = (data: MondialRelayData) =>
  [
    data.Adresse1,
    data.Adresse2,
    [data.CP, data.Ville].filter(Boolean).join(" "),
    data.Pays,
  ]
    .filter(Boolean)
    .join(", ");

export default function MondialRelayPicker({ onSelect }: MondialRelayPickerProps) {
  const reactId = useId().replace(/:/g, "");
  const widgetId = `mondial-relay-widget-${reactId}`;
  const targetId = `mondial-relay-target-${reactId}`;
  const [status, setStatus] = useState("Chargement du module officiel Mondial Relay...");

  useEffect(() => {
    let cancelled = false;

    const initWidget = async () => {
      try {
        loadStyle("https://unpkg.com/leaflet/dist/leaflet.css");
        await loadScript("https://ajax.googleapis.com/ajax/libs/jquery/2.2.4/jquery.min.js");
        await loadScript("https://unpkg.com/leaflet/dist/leaflet.js");
        await loadScript(
          "https://widget.mondialrelay.com/parcelshop-picker/jquery.plugin.mondialrelay.parcelshoppicker.min.js"
        );

        if (cancelled || !window.jQuery) {
          return;
        }

        const brand = process.env.NEXT_PUBLIC_MONDIAL_RELAY_BRAND || "BDTEST ";
        const $widget = window.jQuery(`#${widgetId}`);

        if (!$widget?.MR_ParcelShopPicker) {
          setStatus("Le module officiel Mondial Relay n'est pas disponible.");
          return;
        }

        $widget.MR_ParcelShopPicker({
          Target: `#${targetId}`,
          Brand: brand,
          Country: "FR",
          AllowedCountries: "FR",
          Theme: "mondialrelay",
          Responsive: true,
          ShowResultsOnMap: false,
          NbResults: 7,
          OnParcelShopSelected: (data: MondialRelayData) => {
            const relayName = [data.Nom, data.ID ? `(${data.ID})` : ""]
              .filter(Boolean)
              .join(" ");
            onSelect(relayName || "Point Relais Mondial Relay", formatRelayAddress(data));
          },
        });

        setStatus("Selectionnez un Point Relais officiel Mondial Relay.");
      } catch {
        setStatus(
          "Impossible de charger Mondial Relay. Verifiez la connexion internet ou le code client."
        );
      }
    };

    initWidget();

    return () => {
      cancelled = true;
    };
  }, [onSelect, targetId, widgetId]);

  return (
    <div className="mondial-relay-picker">
      <span>Recherche officielle Point Relais Mondial Relay</span>
      <p>{status}</p>
      <input id={targetId} type="hidden" />
      <div id={widgetId} />
    </div>
  );
}
