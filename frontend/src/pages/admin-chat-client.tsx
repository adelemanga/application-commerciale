import { ApolloProvider, useMutation, useQuery } from "@apollo/client";
import Link from "next/link";
import { useRouter } from "next/router";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import client from "../graphql/client";
import {
  MARK_CLIENT_CONVERSATION_AS_READ,
  SEND_PLATFORM_MESSAGE_TO_CLIENT,
} from "../graphql/mutations";
import { GET_ALL_PLATFORM_CLIENT_MESSAGES, WHO_AM_I } from "../graphql/queries";
import { Role } from "../interface/types";

function AdminChatClientContent() {
  const router = useRouter();
  const selectedEmail =
    typeof router.query.email === "string"
      ? decodeURIComponent(router.query.email)
      : "";
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [newClientMessagePopupCount, setNewClientMessagePopupCount] =
    useState(0);
  const chatThreadRef = useRef<HTMLDivElement | null>(null);
  const previousClientMessageCountRef = useRef(0);
  const { data: userData, loading: loadingUser } = useQuery(WHO_AM_I, {
    fetchPolicy: "network-only",
  });
  const isAdmin =
    userData?.whoAmI?.isLoggedIn && userData?.whoAmI?.role === Role.Admin;
  const {
    data: platformMessagesData,
    loading: loadingMessages,
    error: messagesError,
  } = useQuery(GET_ALL_PLATFORM_CLIENT_MESSAGES, {
    fetchPolicy: "network-only",
    pollInterval: 15000,
    skip: !isAdmin,
  });
  const [sendPlatformMessage, { loading: sendingMessage }] = useMutation(
    SEND_PLATFORM_MESSAGE_TO_CLIENT,
    {
      refetchQueries: [{ query: GET_ALL_PLATFORM_CLIENT_MESSAGES }],
    }
  );
  const [markConversationAsRead, { loading: markingConversationAsRead }] =
    useMutation(MARK_CLIENT_CONVERSATION_AS_READ, {
      refetchQueries: [{ query: GET_ALL_PLATFORM_CLIENT_MESSAGES }],
    });

  const conversationMessages = useMemo(() => {
    return (platformMessagesData?.getAllPlatformClientMessages ?? [])
      .filter((platformMessage: any) => {
        return platformMessage.client?.email === selectedEmail;
      })
      .sort((firstMessage: any, secondMessage: any) => {
        return (
          new Date(firstMessage.createdAt).getTime() -
          new Date(secondMessage.createdAt).getTime()
        );
      });
  }, [platformMessagesData?.getAllPlatformClientMessages, selectedEmail]);

  const clientIdentity = conversationMessages[0]?.client;
  const clientDisplayName = [
    clientIdentity?.firstname,
    clientIdentity?.lastname,
  ]
    .filter(Boolean)
    .join(" ");
  const unreadClientMessages = conversationMessages.filter(
    (platformMessage: any) =>
      platformMessage.senderRole === "Client" && !platformMessage.readAt
  );
  const unreadClientMessageIds = unreadClientMessages
    .map((platformMessage: any) => platformMessage.id)
    .join(",");
  const clientMessageCount = conversationMessages.filter(
    (platformMessage: any) => platformMessage.senderRole === "Client"
  ).length;

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanMessage = message.trim();
    setNotice("");

    if (!selectedEmail) {
      setNotice("Aucun client selectionne.");
      return;
    }

    if (!cleanMessage) {
      setNotice("Ecrivez un message avant de l'envoyer au client.");
      return;
    }

    try {
      await sendPlatformMessage({
        variables: {
          clientEmail: selectedEmail,
          message: cleanMessage,
        },
      });
      setMessage("");
      setNotice("Message envoye dans le tchat client.");
    } catch {
      setNotice("Impossible d'envoyer ce message au client.");
    }
  };

  const markClientMessagesAsRead = async () => {
    setNotice("");

    if (!selectedEmail) {
      setNotice("Aucun client selectionne.");
      return;
    }

    try {
      await markConversationAsRead({
        variables: { clientEmail: selectedEmail },
      });
      setNotice("Messages du client marques comme lus.");
    } catch {
      setNotice("Impossible de marquer les messages du client comme lus.");
    }
  };

  useEffect(() => {
    if (!loadingUser && !isAdmin) {
      router.push("/connexion-administrateur");
    }
  }, [isAdmin, loadingUser, router]);

  useEffect(() => {
    if (router.isReady && !selectedEmail) {
      router.replace("/admin-messages");
    }
  }, [router, selectedEmail]);

  useEffect(() => {
    if (
      !isAdmin ||
      !selectedEmail ||
      !unreadClientMessageIds ||
      markingConversationAsRead
    ) {
      return;
    }

    const readIntentKey = `mark-admin-chat-read:${selectedEmail}`;

    if (
      typeof window === "undefined" ||
      window.sessionStorage.getItem(readIntentKey) !== "1"
    ) {
      return;
    }

    markConversationAsRead({
      variables: { clientEmail: selectedEmail },
    })
      .then(() => {
        window.sessionStorage.removeItem(readIntentKey);
      })
      .catch(() => undefined);
  }, [
    isAdmin,
    markConversationAsRead,
    markingConversationAsRead,
    selectedEmail,
    unreadClientMessageIds,
  ]);

  useEffect(() => {
    if (!isAdmin || !selectedEmail) return;

    const previousClientMessageCount = previousClientMessageCountRef.current;

    if (
      previousClientMessageCount > 0 &&
      clientMessageCount > previousClientMessageCount
    ) {
      setNewClientMessagePopupCount(
        clientMessageCount - previousClientMessageCount
      );
    }

    previousClientMessageCountRef.current = clientMessageCount;
  }, [clientMessageCount, isAdmin, selectedEmail]);

  useEffect(() => {
    if (!chatThreadRef.current) return;

    chatThreadRef.current.scrollTop = chatThreadRef.current.scrollHeight;
  }, [conversationMessages.length]);

  if (loadingUser) {
    return (
      <main className="admin-page admin-chat-page">
        <section className="empty-cart-panel admin-auth-required">
          <h2>Verification de vos droits...</h2>
          <p>Connexion administrateur en cours de verification.</p>
        </section>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="admin-page admin-chat-page">
        <section className="empty-cart-panel admin-auth-required">
          <h2>Connexion administrateur requise</h2>
          <p>
            Connectez-vous avec un compte administrateur pour ouvrir ce tchat.
          </p>
          <Link href="/connexion-administrateur">Se connecter en admin</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-page admin-chat-page">
      <section className="admin-hero">
        <p className="shop-kicker">Tchat client</p>
        <h1>
          {clientIdentity
            ? `${clientIdentity.firstname} ${clientIdentity.lastname}`
            : "Conversation client"}
        </h1>
        <p>{selectedEmail}</p>
        <div className="admin-shortcuts">
          <Link href="/admin-messages">Retour messages</Link>
          <Link href="/admin">Reservations</Link>
        </div>
      </section>

      {notice && <p className="shop-message">{notice}</p>}
      {newClientMessagePopupCount > 0 && (
        <div className="admin-message-popup chat-message-popup" role="status">
          <div>
            <strong>
              {newClientMessagePopupCount} nouveau(x) message(s) client
            </strong>
            <span>Un message vient d'arriver dans cette conversation.</span>
          </div>
          <button
            type="button"
            aria-label="Fermer l'alerte de nouveau message"
            onClick={() => setNewClientMessagePopupCount(0)}
          >
            ×
          </button>
        </div>
      )}

      <section className="admin-chat-panel">
        <div className="admin-section-heading">
          <div>
            <p className="shop-kicker">Conversation</p>
            <h2>Tchat avec le client</h2>
          </div>
          <div className="message-heading-actions">
            {unreadClientMessages.length > 0 && (
              <button
                className="message-read-action"
                type="button"
                onClick={markClientMessagesAsRead}
                disabled={markingConversationAsRead}
              >
                {markingConversationAsRead
                  ? "Validation..."
                  : "Marquer comme lu"}
              </button>
            )}
            <strong>{conversationMessages.length} message(s)</strong>
          </div>
        </div>
        {unreadClientMessages.length > 0 && (
          <p className="chat-unread-alert">
            {unreadClientMessages.length} nouveau(x) message(s) client.
          </p>
        )}
        {clientMessageCount > 0 && (
          <div className="chat-received-summary" role="status">
            <strong>{clientMessageCount} message(s) recu(s) du client</strong>
            <span>
              {unreadClientMessages.length > 0
                ? `${unreadClientMessages.length} message(s) non lu(s)`
                : "Tous les messages reçues sont lus"}
            </span>
          </div>
        )}

        {loadingMessages && <p>Chargement du tchat...</p>}
        {messagesError && <p>Impossible de charger la conversation.</p>}
        {!loadingMessages && !conversationMessages.length && (
          <p>Aucun message dans ce tchat pour le moment.</p>
        )}

        {conversationMessages.length > 0 && (
          <div className="admin-chat-thread" ref={chatThreadRef}>
            {conversationMessages.map((platformMessage: any) => {
              const isAdminMessage = platformMessage.senderRole !== "Client";

              return (
                <article
                  className={
                    isAdminMessage
                      ? "admin-chat-message admin-chat-message-admin"
                      : "admin-chat-message admin-chat-message-client"
                  }
                  key={platformMessage.id}
                >
                  <div>
                    <strong>
                      {isAdminMessage
                        ? "BeautyPlace"
                        : clientDisplayName || selectedEmail || "Client"}
                    </strong>
                    <span>
                      {new Date(platformMessage.createdAt).toLocaleString(
                        "fr-FR"
                      )}
                    </span>
                  </div>
                  <p>{platformMessage.message}</p>
                  <span
                    className={
                      isAdminMessage
                        ? "message-read-status"
                        : platformMessage.readAt
                        ? "message-read-status"
                        : "message-unread-status"
                    }
                  >
                    {isAdminMessage
                      ? platformMessage.readAt
                        ? "✓✓ Lu par le client"
                        : "● Non lu par le client"
                      : platformMessage.readAt
                      ? "✓✓ Lu"
                      : "● Non lu"}
                  </span>
                </article>
              );
            })}
          </div>
        )}

        <form
          className="platform-reply-form admin-chat-form"
          onSubmit={sendMessage}
        >
          <label>
            Repondre au client
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Ecrivez votre reponse ici..."
            />
          </label>
          <button type="submit" disabled={sendingMessage}>
            {sendingMessage ? "Envoi..." : "Envoyer dans le tchat"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default function AdminChatClientPage() {
  return (
    <ApolloProvider client={client}>
      <Header />
      <AdminChatClientContent />
      <Footer />
    </ApolloProvider>
  );
}
