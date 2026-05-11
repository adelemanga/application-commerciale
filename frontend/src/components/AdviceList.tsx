import { useMutation, useQuery } from "@apollo/client";
import { useState } from "react";
import { REPLY_TO_ADVICE } from "../graphql/mutations";
import { GET_ALL_ADVICES, WHO_AM_I } from "../graphql/queries";
import { Role } from "../interface/types";

const PLACEHOLDER_IMAGE_PATTERNS = [
  "default-image",
  "missing-picture",
  "no-photo",
  "no_photo",
  "no%20photo",
  "placeholder",
  "default-avatar",
  "profile-icon-vector",
  "no-photo-available",
];

const hasProfilePhoto = (advice: any) => {
  const image = advice?.imgUrl?.trim().toLowerCase();

  return Boolean(
    image &&
      !PLACEHOLDER_IMAGE_PATTERNS.some((pattern) => image.includes(pattern))
  );
};

function AdviceList() {
  const [brokenImageIds, setBrokenImageIds] = useState<Set<string | number>>(
    new Set()
  );
  const [replyByAdviceId, setReplyByAdviceId] = useState<Record<string, string>>(
    {}
  );
  const [replyNotice, setReplyNotice] = useState("");
  const { loading, error, data } = useQuery(GET_ALL_ADVICES);
  const { data: userData } = useQuery(WHO_AM_I, {
    fetchPolicy: "cache-and-network",
  });
  const [replyToAdvice, { loading: replying }] = useMutation(REPLY_TO_ADVICE, {
    refetchQueries: [{ query: GET_ALL_ADVICES }],
  });
  const isAdmin =
    userData?.whoAmI?.isLoggedIn && userData?.whoAmI?.role === Role.Admin;
  const visibleAdvices = (data?.getAllAvis ?? []).filter((advice: any) => {
    return hasProfilePhoto(advice) && !brokenImageIds.has(advice.id);
  });

  const hideBrokenAdvice = (adviceId: string | number) => {
    setBrokenImageIds((currentIds) => {
      const nextIds = new Set(currentIds);
      nextIds.add(adviceId);
      return nextIds;
    });
  };

  const submitReply = async (event: React.FormEvent, adviceId: string) => {
    event.preventDefault();
    const reply = replyByAdviceId[adviceId]?.trim();
    setReplyNotice("");

    if (!reply) {
      setReplyNotice("Ecrivez une reponse avant de l'enregistrer.");
      return;
    }

    try {
      await replyToAdvice({
        variables: {
          aviId: String(adviceId),
          reply,
        },
      });
      setReplyByAdviceId((currentReplies) => ({
        ...currentReplies,
        [adviceId]: "",
      }));
      setReplyNotice("Reponse BeautyPlace enregistree sous l'avis.");
    } catch {
      setReplyNotice("Impossible d'enregistrer la reponse administrateur.");
    }
  };

  if (loading) return <p className="shop-message">Chargement des avis...</p>;
  if (error) return <p className="shop-message">Impossible de charger les avis.</p>;

  if (!visibleAdvices.length) {
    return (
      <section className="customer-advice-list-section">
        <h1>Avis des utilisateurs</h1>
        <p>Aucun avis pour le moment.</p>
      </section>
    );
  }

  return (
    <section className="customer-advice-list-section">
      <h1>Avis des utilisateurs</h1>
      {replyNotice && <p className="shop-message">{replyNotice}</p>}

      <div className="customer-advice-grid">
        {visibleAdvices.map((advice: any) => (
          <article key={advice.id} className="advice-card">
            <img
              className="advice-avatar"
              src={advice.imgUrl}
              alt={`${advice.name} ${advice.lastname}`}
              onError={() => hideBrokenAdvice(advice.id)}
            />
            <h3>{advice.title}</h3>

            <p className="name">
              {advice.name} {advice.lastname}
            </p>
            <p className="rating">{"⭐".repeat(advice.rating)}</p>

            <p>{advice.message}</p>

            {advice.adminReply && (
              <div className="advice-admin-reply">
                <strong>Reponse BeautyPlace</strong>
                <p>{advice.adminReply}</p>
                {advice.adminReplyAt && (
                  <span>
                    {new Date(advice.adminReplyAt).toLocaleString("fr-FR")}
                  </span>
                )}
              </div>
            )}

            {isAdmin && (
              <form
                className="advice-admin-reply-form"
                onSubmit={(event) => submitReply(event, advice.id)}
              >
                <label>
                  Repondre a cet avis
                  <textarea
                    value={replyByAdviceId[advice.id] ?? ""}
                    onChange={(event) =>
                      setReplyByAdviceId((currentReplies) => ({
                        ...currentReplies,
                        [advice.id]: event.target.value,
                      }))
                    }
                    placeholder="Ecrire une reponse publique BeautyPlace..."
                  />
                </label>
                <button type="submit" disabled={replying}>
                  {advice.adminReply ? "Modifier la reponse" : "Publier la reponse"}
                </button>
              </form>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

export default AdviceList;
