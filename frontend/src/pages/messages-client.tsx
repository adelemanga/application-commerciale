import { ApolloProvider, useMutation, useQuery } from "@apollo/client";
import Link from "next/link";
import { useRouter } from "next/router";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import client from "../graphql/client";
import {
  MARK_MY_CLIENT_MESSAGES_AS_READ,
  SEND_PLATFORM_MESSAGE_TO_ADMIN,
} from "../graphql/mutations";
import { GET_MY_CLIENT_MESSAGES, WHO_AM_I } from "../graphql/queries";
import { Role } from "../interface/types";

const defaultClientAvatar =
  "https://img.freepik.com/premium-vector/default-avatar-profile-icon-vector-social-media-user-image_543062-212.jpg";

const beautyPlaceAvatar =
  "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=120&q=80";

function MessagesClientContent() {
  const router = useRouter();
  const [messageToAdmin, setMessageToAdmin] = useState("");
  const [notice, setNotice] = useState("");
  const { data: userData, loading: loadingUser } = useQuery(WHO_AM_I, {
    fetchPolicy: "network-only",
  });
  const isClient =
    userData?.whoAmI?.isLoggedIn && userData?.whoAmI?.role === Role.User;
  const {
    data: clientMessagesData,
    loading: loadingClientMessages,
    error: clientMessagesError,
  } = useQuery(GET_MY_CLIENT_MESSAGES, {
    fetchPolicy: "network-only",
    skip: !isClient,
  });
  const [markMessagesAsRead, { loading: markingMessagesAsRead }] =
    useMutation(MARK_MY_CLIENT_MESSAGES_AS_READ, {
      refetchQueries: [{ query: GET_MY_CLIENT_MESSAGES }],
    });
  const [sendMessageToAdmin, { loading: sendingMessage }] = useMutation(
    SEND_PLATFORM_MESSAGE_TO_ADMIN,
    {
      refetchQueries: [{ query: GET_MY_CLIENT_MESSAGES }],
    }
  );
  const clientMessages = useMemo(() => {
    return [...(clientMessagesData?.getMyClientMessages ?? [])].sort(
      (firstMessage: any, secondMessage: any) =>
        new Date(firstMessage.createdAt).getTime() -
        new Date(secondMessage.createdAt).getTime()
    );
  }, [clientMessagesData?.getMyClientMessages]);
  const chatThreadRef = useRef<HTMLDivElement | null>(null);
  const unreadAdminMessages = clientMessages.filter(
    (clientMessage: any) =>
      clientMessage.senderRole === "Admin" && !clientMessage.readAt
  );
  const unreadAdminMessageIds = unreadAdminMessages
    .map((clientMessage: any) => clientMessage.id)
    .join(",");
  const clientAvatar = userData?.whoAmI?.avatarUrl || defaultClientAvatar;

  const submitMessageToAdmin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanMessage = messageToAdmin.trim();
    setNotice("");

    if (!cleanMessage) {
      setNotice("Ecrivez un message avant de l'envoyer a l'administrateur.");
      return;
    }

    try {
      await sendMessageToAdmin({
        variables: {
          message: cleanMessage,
        },
      });
      setMessageToAdmin("");
      setNotice("Votre message a ete envoye a l'administrateur BeautyPlace.");
    } catch {
      setNotice("Impossible d'envoyer le message pour le moment.");
    }
  };

  const markBeautyPlaceMessagesAsRead = async () => {
    setNotice("");

    try {
      await markMessagesAsRead();
      setNotice("Messages BeautyPlace marques comme lus.");
    } catch {
      setNotice("Impossible de marquer les messages comme lus.");
    }
  };

  useEffect(() => {
    if (!loadingUser && !isClient) {
      router.push("/connexion-client");
    }
  }, [isClient, loadingUser, router]);

  useEffect(() => {
    if (
      !isClient ||
      !unreadAdminMessageIds ||
      markingMessagesAsRead
    ) {
      return;
    }

    markMessagesAsRead()
      .catch(() => undefined);
  }, [
    isClient,
    markMessagesAsRead,
    markingMessagesAsRead,
    unreadAdminMessageIds,
  ]);

  useEffect(() => {
    if (!chatThreadRef.current) return;

    chatThreadRef.current.scrollTop = chatThreadRef.current.scrollHeight;
  }, [clientMessages.length]);

  if (loadingUser) {
    return <p className="auth-message">Verification de votre compte client...</p>;
  }

  if (!isClient) {
    return null;
  }

  return (
    <main className="admin-page admin-chat-page">
      <section className="shop-hero">
        <p className="shop-kicker">Messages BeautyPlace</p>
        <h1>Ma messagerie</h1>
        <p>
          Retrouvez ici les messages envoyes par l'administrateur depuis la
          plateforme BeautyPlace.
        </p>
        <div className="category-actions">
          <Link href="/clients">Retour espace client</Link>
        </div>
      </section>

      {notice && <p className="shop-message">{notice}</p>}

      <section className="admin-chat-panel">
        <div className="admin-section-heading">
          <div>
            <p className="shop-kicker">Conversation</p>
            <h2>Mes messages</h2>
          </div>
          <div className="message-heading-actions">
            {unreadAdminMessages.length > 0 && (
              <button
                className="message-read-action"
                type="button"
                onClick={markBeautyPlaceMessagesAsRead}
                disabled={markingMessagesAsRead}
              >
                {markingMessagesAsRead ? "Validation..." : "Marquer comme lu"}
              </button>
            )}
            <strong>{clientMessages.length}</strong>
          </div>
        </div>
        {unreadAdminMessages.length > 0 && (
          <p className="chat-unread-alert">
            {unreadAdminMessages.length} nouveau(x) message(s) BeautyPlace.
          </p>
        )}
        {loadingClientMessages && <p>Chargement des messages...</p>}
        {clientMessagesError && (
          <p>Impossible de charger vos messages pour le moment.</p>
        )}
        {!loadingClientMessages && !clientMessages.length && (
          <p>Aucun message de l'administrateur pour le moment.</p>
        )}
        {clientMessages.length > 0 && (
          <div className="admin-chat-thread" ref={chatThreadRef}>
            {clientMessages.map((clientMessage: any) => {
              const isClientMessage = clientMessage.senderRole === "Client";

              return (
                <article
                  className={
                    isClientMessage
                      ? "admin-chat-message-row admin-chat-message-row-client"
                      : "admin-chat-message-row admin-chat-message-row-admin"
                  }
                  key={clientMessage.id}
                >
                  <img
                    className="chat-avatar"
                    src={isClientMessage ? clientAvatar : beautyPlaceAvatar}
                    alt={isClientMessage ? "Photo du client" : "BeautyPlace"}
                    onError={(event) => {
                      event.currentTarget.src = isClientMessage
                        ? defaultClientAvatar
                        : defaultClientAvatar;
                    }}
                  />
                  <div
                    className={
                      isClientMessage
                        ? "admin-chat-message admin-chat-message-client"
                        : "admin-chat-message admin-chat-message-admin"
                    }
                  >
                    <div>
                      <strong>{isClientMessage ? "Vous" : "BeautyPlace"}</strong>
                      <span>
                        {new Date(clientMessage.createdAt).toLocaleString(
                          "fr-FR"
                        )}
                      </span>
                    </div>
                    <p>{clientMessage.message}</p>
                    <span
                      className={
                        isClientMessage
                          ? "message-read-status"
                          : clientMessage.readAt
                          ? "message-read-status"
                          : "message-unread-status"
                      }
                    >
                      {isClientMessage
                        ? clientMessage.readAt
                          ? "✓✓ Lu par BeautyPlace"
                          : "● Non lu par BeautyPlace"
                        : clientMessage.readAt
                        ? "✓✓ Lu"
                        : "● Non lu"}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        <form
          className="platform-reply-form admin-chat-form chat-compose-form"
          onSubmit={submitMessageToAdmin}
        >
          <label>
            Nouveau message
            <textarea
              value={messageToAdmin}
              onChange={(event) => setMessageToAdmin(event.target.value)}
              placeholder="Ecrivez votre message a BeautyPlace..."
            />
          </label>
          <button type="submit" disabled={sendingMessage}>
            {sendingMessage ? "Envoi..." : "Envoyer"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default function MessagesClientPage() {
  return (
    <ApolloProvider client={client}>
      <Header />
      <MessagesClientContent />
      <Footer />
    </ApolloProvider>
  );
}
