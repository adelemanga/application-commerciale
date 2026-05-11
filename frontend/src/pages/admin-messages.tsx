import { ApolloProvider, useMutation, useQuery } from "@apollo/client";
import Link from "next/link";
import { useRouter } from "next/router";
import { FormEvent, useEffect, useMemo, useState } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import client from "../graphql/client";
import { SEND_PLATFORM_MESSAGE_TO_CLIENT } from "../graphql/mutations";
import {
  GET_ALL_CONTACTS,
  GET_ALL_PLATFORM_CLIENT_MESSAGES,
  WHO_AM_I,
} from "../graphql/queries";
import { Role } from "../interface/types";

function AdminMessagesContent() {
  const router = useRouter();
  const [replyMessages, setReplyMessages] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const { data: userData, loading: loadingUser } = useQuery(WHO_AM_I, {
    fetchPolicy: "network-only",
  });
  const {
    data: contactsData,
    loading: loadingContacts,
    error: contactsError,
  } = useQuery(GET_ALL_CONTACTS, {
    fetchPolicy: "cache-and-network",
  });
  const {
    data: platformMessagesData,
    loading: loadingPlatformMessages,
    error: platformMessagesError,
  } = useQuery(GET_ALL_PLATFORM_CLIENT_MESSAGES, {
    fetchPolicy: "cache-and-network",
    pollInterval: 30000,
  });
  const [sendPlatformMessage, { loading: sendingMessage }] = useMutation(
    SEND_PLATFORM_MESSAGE_TO_CLIENT,
    {
      refetchQueries: [{ query: GET_ALL_PLATFORM_CLIENT_MESSAGES }],
    }
  );

  const isAdmin =
    userData?.whoAmI?.isLoggedIn && userData?.whoAmI?.role === Role.Admin;
  const contacts = contactsData?.getAllContacts ?? [];
  const platformMessages =
    platformMessagesData?.getAllPlatformClientMessages ?? [];
  const unreadClientMessageCount = platformMessages.filter(
    (platformMessage: any) =>
      platformMessage.senderRole === "Client" && !platformMessage.readAt
  ).length;
  const platformConversations = useMemo(() => {
    const conversationsByEmail = new Map<string, any>();

    platformMessages.forEach((platformMessage: any) => {
      const email = platformMessage.client?.email;
      if (!email) return;

      const currentConversation = conversationsByEmail.get(email) ?? {
        email,
        client: platformMessage.client,
        messages: [],
        unreadClientMessages: 0,
        clientMessageCount: 0,
        lastMessage: platformMessage,
      };

      currentConversation.messages.push(platformMessage);
      currentConversation.client = platformMessage.client;

      if (platformMessage.senderRole === "Client") {
        currentConversation.clientMessageCount += 1;
      }

      if (platformMessage.senderRole === "Client" && !platformMessage.readAt) {
        currentConversation.unreadClientMessages += 1;
      }

      if (
        new Date(platformMessage.createdAt).getTime() >
        new Date(currentConversation.lastMessage.createdAt).getTime()
      ) {
        currentConversation.lastMessage = platformMessage;
      }

      conversationsByEmail.set(email, currentConversation);
    });

    return Array.from(conversationsByEmail.values()).sort(
      (firstConversation: any, secondConversation: any) =>
        new Date(secondConversation.lastMessage.createdAt).getTime() -
        new Date(firstConversation.lastMessage.createdAt).getTime()
    );
  }, [platformMessages]);

  const sendReplyOnPlatform = async (
    event: FormEvent<HTMLFormElement>,
    target: { id: string | number; email: string }
  ) => {
    event.preventDefault();
    const message = replyMessages[target.id]?.trim();
    setNotice("");

    if (!message) {
      setNotice("Ecrivez un message avant de l'envoyer au client.");
      return;
    }

    try {
      await sendPlatformMessage({
        variables: {
          clientEmail: target.email,
          message,
        },
      });
      setReplyMessages((current) => ({ ...current, [target.id]: "" }));
      setNotice(`Message envoye sur l'espace client de ${target.email}.`);
    } catch {
      setNotice(
        "Impossible d'envoyer ce message sur la plateforme. Verifiez que le client est bien inscrit."
      );
    }
  };

  useEffect(() => {
    if (!loadingUser && !isAdmin) {
      router.push("/connexion-administrateur");
    }
  }, [isAdmin, loadingUser, router]);

  if (loadingUser) {
    return <p className="auth-message">Verification de vos droits...</p>;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <main className="admin-page">
      <section className="admin-hero">
        <p className="shop-kicker">Contact</p>
        <h1>Messages clients</h1>
        <p>
          Retrouvez ici les messages envoyes depuis la page contact et repondez
          directement avec Gmail.
        </p>
        <div className="admin-shortcuts">
          <Link href="/admin">Reservations</Link>
          <Link href="/admin-commandes-traitees">Commandes traitees</Link>
          <Link href="/admin#gestion-produits">Produits</Link>
        </div>
      </section>

      {notice && <p className="shop-message">{notice}</p>}

      <section className="admin-panel admin-messages">
        <div className="admin-section-heading">
          <div>
            <p className="shop-kicker">Plateforme</p>
            <h2>Messagerie client</h2>
          </div>
          <strong>
            {platformConversations.length} conversation(s)
            {unreadClientMessageCount > 0
              ? ` - ${unreadClientMessageCount} non lu(s)`
              : ""}
          </strong>
        </div>
        {loadingPlatformMessages && !platformMessages.length && (
          <p>Chargement des messages plateforme...</p>
        )}
        {platformMessagesError && (
          <p>Impossible de charger les messages de la plateforme.</p>
        )}
        {!loadingPlatformMessages && !platformMessages.length && (
          <p>Aucun message plateforme pour le moment.</p>
        )}
        {platformConversations.length > 0 && (
          <div className="admin-message-list">
            {platformConversations.map((conversation: any) => {
              const platformMessage = conversation.lastMessage;
              const clientName = [
                conversation.client?.firstname,
                conversation.client?.lastname,
              ]
                .filter(Boolean)
                .join(" ");
              const platformTarget = {
                id: `platform-${conversation.email}`,
                email: conversation.email,
              };

              return (
                <article className="admin-message-card" key={conversation.email}>
                  <div>
                    <span className="admin-mini-label">
                      Conversation client
                    </span>
                    {conversation.unreadClientMessages > 0 && (
                      <span className="client-status-badge visitor">
                        {conversation.unreadClientMessages} nouveau(x)
                      </span>
                    )}
                    <strong>{clientName || conversation.email}</strong>
                    <span className="client-status-badge registered">
                      Client inscrit
                    </span>
                    <a href={`mailto:${conversation.email}`}>
                      {conversation.email}
                    </a>
                    <span className="client-message-count-badge">
                      {conversation.clientMessageCount} message(s) client
                    </span>
                    {conversation.email && (
                      <Link
                        className="open-chat-button"
                        href={`/admin-chat-client?email=${encodeURIComponent(
                          conversation.email
                        )}`}
                        onClick={() =>
                          window.sessionStorage.setItem(
                            `mark-admin-chat-read:${conversation.email}`,
                            "1"
                          )
                        }
                      >
                        Ouvrir le tchat
                      </Link>
                    )}
                    <small>
                      {new Date(platformMessage.createdAt).toLocaleString(
                        "fr-FR"
                      )}
                    </small>
                  </div>
                  <p>
                    <strong>Dernier message : </strong>
                    {platformMessage.message}
                  </p>
                  <span
                    className={
                      platformMessage.readAt
                        ? "message-read-status"
                        : "message-unread-status"
                    }
                  >
                    {platformMessage.senderRole === "Admin"
                      ? platformMessage.readAt
                        ? "✓✓ Lu par le client"
                        : "● Non lu par le client"
                      : platformMessage.readAt
                      ? "✓✓ Lu par BeautyPlace"
                      : "● Non lu par BeautyPlace"}
                  </span>
                  <form
                    className="platform-reply-form"
                    onSubmit={(event) =>
                      sendReplyOnPlatform(event, platformTarget)
                    }
                  >
                    <label>
                      Reponse plateforme
                      <textarea
                        value={replyMessages[platformTarget.id] ?? ""}
                        onChange={(event) =>
                          setReplyMessages((current) => ({
                            ...current,
                            [platformTarget.id]: event.target.value,
                          }))
                        }
                        placeholder="Repondre directement dans la messagerie client..."
                      />
                    </label>
                    <button type="submit" disabled={sendingMessage}>
                      Envoyer sur la plateforme
                    </button>
                  </form>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="admin-panel admin-messages">
        <div className="admin-section-heading">
          <div>
            <p className="shop-kicker">Boite contact</p>
            <h2>Messages recus</h2>
          </div>
          <strong>{contacts.length} message(s)</strong>
        </div>
        {loadingContacts && !contacts.length && <p>Chargement des messages...</p>}
        {contactsError && <p>Impossible de charger les messages clients.</p>}
        {!loadingContacts && !contacts.length && (
          <p>Aucun message client pour le moment.</p>
        )}
        {contacts.length > 0 && (
          <div className="admin-message-list">
            {contacts.map((contact: any) => (
              <article className="admin-message-card" key={contact.id}>
                <div>
                  <span className="admin-mini-label">Client</span>
                  <strong>
                    {contact.name} {contact.lastname}
                  </strong>
                  <span
                    className={
                      contact.isRegisteredClient
                        ? "client-status-badge registered"
                        : "client-status-badge visitor"
                    }
                  >
                    {contact.isRegisteredClient
                      ? "Client inscrit"
                      : "Visiteur non inscrit"}
                  </span>
                  <a href={`mailto:${contact.email}`}>{contact.email}</a>
                  {contact.isRegisteredClient && (
                    <Link
                      className="open-chat-button"
                      href={`/admin-chat-client?email=${encodeURIComponent(
                        contact.email
                      )}`}
                      onClick={() =>
                        window.sessionStorage.setItem(
                          `mark-admin-chat-read:${contact.email}`,
                          "1"
                        )
                      }
                    >
                      Ouvrir le tchat
                    </Link>
                  )}
                  <a
                    className="gmail-reply-button"
                    href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
                      contact.email
                    )}&su=${encodeURIComponent(
                      "Reponse a votre message BeautyPlace"
                    )}&body=${encodeURIComponent(
                      `Bonjour ${contact.name || ""},\n\nMerci pour votre message. Nous revenons vers vous concernant votre demande.\n\n\nCordialement,\nL'equipe BeautyPlace`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Repondre avec Gmail
                  </a>
                </div>
                <p>{contact.message}</p>
                {contact.isRegisteredClient ? (
                  <form
                    className="platform-reply-form"
                    onSubmit={(event) => sendReplyOnPlatform(event, contact)}
                  >
                    <label>
                      Reponse plateforme
                      <textarea
                        value={replyMessages[contact.id] ?? ""}
                        onChange={(event) =>
                          setReplyMessages((current) => ({
                            ...current,
                            [contact.id]: event.target.value,
                          }))
                        }
                        placeholder="Ecrire un message visible dans l'espace client..."
                      />
                    </label>
                    <button type="submit" disabled={sendingMessage}>
                      Envoyer sur la plateforme
                    </button>
                  </form>
                ) : (
                  <p className="platform-reply-warning">
                    Reponse plateforme indisponible : cette personne n'a pas
                    encore de compte client.
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default function AdminMessagesPage() {
  return (
    <ApolloProvider client={client}>
      <Header />
      <AdminMessagesContent />
      <Footer />
    </ApolloProvider>
  );
}
