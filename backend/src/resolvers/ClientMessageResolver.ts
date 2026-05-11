import { Arg, Authorized, Ctx, Mutation, Query, Resolver } from "type-graphql";
import { Context } from "../../src";
import { ClientMessage } from "../entities/ClientMessage";
import { Role, User } from "../entities/User";

@Resolver(ClientMessage)
class ClientMessageResolver {
  @Authorized(Role.Admin)
  @Query(() => [ClientMessage])
  async getAllPlatformClientMessages() {
    return ClientMessage.find({
      relations: {
        client: true,
      },
      order: {
        createdAt: "DESC",
      },
    });
  }

  @Authorized(Role.User)
  @Query(() => [ClientMessage])
  async getMyClientMessages(@Ctx() context: Context) {
    return ClientMessage.find({
      where: {
        client: { id: context.id },
      },
      relations: {
        client: true,
      },
      order: {
        createdAt: "DESC",
      },
    });
  }

  @Authorized(Role.User)
  @Mutation(() => Boolean)
  async markMyClientMessagesAsRead(@Ctx() context: Context) {
    const unreadAdminMessages = await ClientMessage.find({
      where: {
        client: { id: context.id },
        senderRole: "Admin",
      },
      relations: {
        client: true,
      },
    });

    const now = new Date();
    const messagesToUpdate = unreadAdminMessages.filter(
      (message) => !message.readAt
    );

    if (!messagesToUpdate.length) {
      return true;
    }

    await ClientMessage.save(
      messagesToUpdate.map((message) => ({
        ...message,
        readAt: now,
      }))
    );

    return true;
  }

  @Authorized(Role.Admin)
  @Mutation(() => Boolean)
  async markClientConversationAsRead(@Arg("clientEmail") clientEmail: string) {
    const normalizedEmail = clientEmail.trim().toLowerCase();
    const client = await User.findOneBy({
      email: normalizedEmail,
      role: Role.User,
    });

    if (!client) {
      throw new Error("Client introuvable.");
    }

    const unreadClientMessages = await ClientMessage.find({
      where: {
        client: { id: client.id },
        senderRole: "Client",
      },
      relations: {
        client: true,
      },
    });

    const now = new Date();
    const messagesToUpdate = unreadClientMessages.filter(
      (message) => !message.readAt
    );

    if (!messagesToUpdate.length) {
      return true;
    }

    await ClientMessage.save(
      messagesToUpdate.map((message) => ({
        ...message,
        readAt: now,
      }))
    );

    return true;
  }

  @Authorized(Role.User)
  @Mutation(() => ClientMessage)
  async sendPlatformMessageToAdmin(
    @Arg("message") message: string,
    @Ctx() context: Context
  ) {
    const cleanMessage = message.trim();

    if (!cleanMessage) {
      throw new Error("Ecrivez un message avant de l'envoyer a l'administrateur.");
    }

    const client = await User.findOneBy({
      id: context.id,
      role: Role.User,
    });

    if (!client) {
      throw new Error("Connectez-vous avec un compte client.");
    }

    const clientMessage = ClientMessage.create({
      client,
      message: cleanMessage,
      senderRole: "Client",
      readAt: undefined,
    });

    return clientMessage.save();
  }

  @Authorized(Role.Admin)
  @Mutation(() => ClientMessage)
  async sendPlatformMessageToClient(
    @Arg("clientEmail") clientEmail: string,
    @Arg("message") message: string
  ) {
    const normalizedEmail = clientEmail.trim().toLowerCase();
    const cleanMessage = message.trim();

    if (!cleanMessage) {
      throw new Error("Ecrivez un message avant de l'envoyer au client.");
    }

    const client = await User.findOneBy({
      email: normalizedEmail,
      role: Role.User,
    });

    if (!client) {
      throw new Error(
        "Ce message ne peut etre envoye que via la plateforme a un client inscrit."
      );
    }

    const clientMessage = ClientMessage.create({
      client,
      message: cleanMessage,
      senderRole: "Admin",
      readAt: undefined,
    });

    return clientMessage.save();
  }
}

export default ClientMessageResolver;
