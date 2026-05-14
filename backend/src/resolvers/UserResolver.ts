import { Mutation, Arg, Query, Ctx, ObjectType, Field } from "type-graphql";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { Role, User } from "../entities/User";
import { ClientMessage } from "../entities/ClientMessage";
import jwt from "jsonwebtoken";
import { Context } from "../../src";
import {
  sendPasswordResetCodeEmail,
  sendPasswordResetEmail,
} from "../services/authEmail";
import { sendPasswordResetSms } from "../services/sms";
import { isValidPhoneNumber, normalizePhoneNumber } from "../utils/phone";

const buildAuthCookie = (token: string, maxAge = 60 * 60 * 24 * 7) => {
  const secureFlag = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `token=${token}; Max-Age=${maxAge}; HttpOnly; SameSite=Lax; Path=/${secureFlag}`;
};

const hashResetToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

const createResetCode = () => String(crypto.randomInt(100000, 1000000));

const buildFrontendUrl = (frontendUrl?: string | null) => {
  const fallback = process.env.FRONTEND_URL || "http://localhost:3000";
  const candidate = frontendUrl?.trim() || fallback;

  if (
    candidate.startsWith("http://localhost") ||
    candidate.startsWith("http://127.0.0.1") ||
    candidate.startsWith("https://")
  ) {
    return candidate.replace(/\/$/, "");
  }

  return fallback.replace(/\/$/, "");
};

@ObjectType()
class UserInfo {
  @Field()
  isLoggedIn: boolean;

  @Field({ nullable: true })
  email?: string;

  @Field({ nullable: true })
  firstname?: string;

  @Field({ nullable: true })
  lastname?: string;

  @Field({ nullable: true })
  phone?: string;

  @Field({ nullable: true })
  address?: string;

  @Field({ nullable: true })
  avatarUrl?: string;

  @Field({ nullable: true })
  role?: Role;
}

export class UserResolver {
  private async authenticate(
    emailFromClient: string,
    passwordFromClient: string,
    context: any,
    expectedRole?: Role
  ) {
    const secret = process.env.JWT_SECRET_KEY;
    if (!secret) throw new Error("NO JWT SECRET KEY DEFINED");
    const normalizedEmail = emailFromClient.trim().toLowerCase();

    const userFromDB = await User.findOneByOrFail({
      email: normalizedEmail,
    });

    const isPasswordCorrect = await bcrypt.compare(
      passwordFromClient.trim(),
      userFromDB.hashedPassword
    );

    if (!isPasswordCorrect) {
      throw new Error("Bad Login");
    }

    if (expectedRole && userFromDB.role !== expectedRole) {
      throw new Error("Bad Role");
    }

    const token = jwt.sign(
      {
        id: userFromDB.id,
        email: userFromDB.email,
        role: userFromDB.role,
      },
      secret,
      { expiresIn: "7d" }
    );

    context.res.setHeader("Set-Cookie", buildAuthCookie(token));

    return "Login accepted";
  }

  @Query(() => String)
  async logout(@Ctx() context: any) {
    context.res.setHeader(
      "Set-Cookie",
      "token=; Max-Age=0; HttpOnly; SameSite=Lax; Path=/"
    );
    return "Logged out";
  }

  @Query(() => String)
  async login(
    @Arg("email") emailFromClient: string,
    @Arg("password") passwordFromClient: string,
    @Ctx() context: any
  ) {
    try {
      return this.authenticate(emailFromClient, passwordFromClient, context);
    } catch (err) {
      console.error(err);
      throw new Error("Bad Login");
    }
  }

  @Query(() => String)
  async loginClient(
    @Arg("email") emailFromClient: string,
    @Arg("password") passwordFromClient: string,
    @Ctx() context: any
  ) {
    try {
      return this.authenticate(
        emailFromClient,
        passwordFromClient,
        context,
        Role.User
      );
    } catch (err: any) {
      console.error(err);
      if (err?.message === "Bad Role") {
        throw new Error(
          "Ce compte est un administrateur. Connectez-vous sur la page administrateur."
        );
      }
      throw new Error("Connexion client refusée");
    }
  }

  @Query(() => String)
  async loginAdmin(
    @Arg("email") emailFromClient: string,
    @Arg("password") passwordFromClient: string,
    @Ctx() context: any
  ) {
    try {
      return this.authenticate(
        emailFromClient,
        passwordFromClient,
        context,
        Role.Admin
      );
    } catch (err: any) {
      console.error(err);
      if (err?.message === "Bad Role") {
        throw new Error(
          "Ce compte est un compte client. Connectez-vous sur la page client."
        );
      }
      throw new Error("Connexion administrateur refusée");
    }
  }

  @Mutation(() => String)
  async createUser(
    @Arg("email") email: string,
    @Arg("firstname") firstname: string,
    @Arg("lastname") lastname: string,
    @Arg("password") password: string,
    @Arg("phone", { nullable: true }) phone: string,
    @Arg("address", { nullable: true }) address: string,
    @Arg("avatarUrl", { nullable: true }) avatarUrl: string,
    @Ctx() context: any
  ) {
    const secret = process.env.JWT_SECRET_KEY;
    if (!secret) throw new Error("NO JWT SECRET KEY DEFINED");

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOneBy({ email: normalizedEmail });
    if (existingUser) {
      throw new Error(
        existingUser.role === Role.Admin
          ? "Cet email est deja utilise par un compte administrateur. Utilisez un autre email pour creer un compte client."
          : "Un compte client existe deja avec cet email. Connectez-vous avec ce compte."
      );
    }

    const cleanPhone = phone?.trim() ? normalizePhoneNumber(phone) : undefined;

    if (cleanPhone && !isValidPhoneNumber(cleanPhone)) {
      throw new Error("Numero de telephone invalide.");
    }

    // HASH PASSWORD (bcrypt FIX IMPORTANT)
    const hashedPassword = await bcrypt.hash(password.trim(), 10);

    const userFromDB = await User.save({
      email: normalizedEmail,
      firstname: firstname.trim(),
      lastname: lastname.trim(),
      phone: cleanPhone,
      address: address?.trim(),
      avatarUrl,
      hashedPassword,
    });

    await ClientMessage.save({
      client: userFromDB,
      senderRole: "Admin",
      message: `Bienvenue ${userFromDB.firstname} chez BeautyPlace. Votre espace client est prêt : vous pouvez suivre vos commandes, retrouver vos factures et écrire à l'équipe BeautyPlace depuis votre messagerie.`,
      readAt: undefined,
    });

    const token = jwt.sign(
      {
        id: userFromDB.id,
        email: userFromDB.email,
        role: userFromDB.role,
      },
      secret,
      { expiresIn: "7d" }
    );

    context.res.setHeader("Set-Cookie", buildAuthCookie(token));

    return token;
  }

  @Mutation(() => String)
  async createAdmin(
    @Arg("email") email: string,
    @Arg("firstname") firstname: string,
    @Arg("lastname") lastname: string,
    @Arg("password") password: string,
    @Arg("adminCode", { nullable: true }) adminCode: string,
    @Ctx() context: any
  ) {
    const secret = process.env.JWT_SECRET_KEY;
    if (!secret) throw new Error("NO JWT SECRET KEY DEFINED");

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOneBy({ email: normalizedEmail });
    if (existingUser) {
      throw new Error("Un compte existe deja avec cet email.");
    }

    const adminCount = await User.countBy({ role: Role.Admin });
    const setupCode = process.env.ADMIN_REGISTRATION_CODE;
    const isCurrentUserAdmin = context.role === Role.Admin;
    const isFirstAdmin = adminCount === 0;
    const hasValidSetupCode = Boolean(
      setupCode && adminCode?.trim() === setupCode.trim()
    );

    if (!isFirstAdmin && !isCurrentUserAdmin && !hasValidSetupCode) {
      throw new Error(
        "Inscription administrateur refusee. Connectez-vous en admin ou utilisez le code administrateur."
      );
    }

    const hashedPassword = await bcrypt.hash(password.trim(), 10);

    const adminFromDB = await User.save({
      email: normalizedEmail,
      firstname: firstname.trim(),
      lastname: lastname.trim(),
      hashedPassword,
      role: Role.Admin,
    });

    const token = jwt.sign(
      {
        id: adminFromDB.id,
        email: adminFromDB.email,
        role: adminFromDB.role,
      },
      secret,
      { expiresIn: "7d" }
    );

    context.res.setHeader("Set-Cookie", buildAuthCookie(token));

    return token;
  }

  @Mutation(() => String)
  async requestPasswordReset(
    @Arg("email") email: string,
    @Arg("frontendUrl", { nullable: true }) frontendUrl?: string
  ) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOneBy({ email: normalizedEmail });
    const successMessage = "Un email de recuperation vient d'etre envoye.";

    if (!user) {
      return successMessage;
    }

    const token = crypto.randomBytes(32).toString("hex");
    user.passwordResetToken = hashResetToken(token);
    user.passwordResetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const resetUrl = `${buildFrontendUrl(
      frontendUrl
    )}/reinitialiser-mot-de-passe?email=${encodeURIComponent(
      user.email
    )}&token=${encodeURIComponent(token)}`;

    await sendPasswordResetEmail(user, resetUrl);
    return successMessage;
  }

  @Mutation(() => String)
  async requestPasswordResetCode(
    @Arg("email") email: string,
    @Arg("channel") channel: string,
    @Arg("frontendUrl", { nullable: true }) frontendUrl?: string
  ) {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedChannel = channel.trim().toLowerCase();
    const user = await User.findOneBy({ email: normalizedEmail });
    const successMessage =
      normalizedChannel === "sms"
        ? "Un code vient d'être envoyé par SMS."
        : " Un code vient d'être envoyé par email.";

    if (!["email", "sms"].includes(normalizedChannel)) {
      throw new Error("Choisissez une récupération par email ou SMS.");
    }

    if (!user) {
      return successMessage;
    }

    if (normalizedChannel === "sms" && !user.phone) {
      throw new Error("Aucun numéro de téléphone n'est associe à ce compte.");
    }

    const code = createResetCode();
    user.passwordResetCode = hashResetToken(code);
    user.passwordResetCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    const resetUrl = `${buildFrontendUrl(
      frontendUrl
    )}/reinitialiser-mot-de-passe?email=${encodeURIComponent(user.email)}`;

    if (normalizedChannel === "sms") {
      await sendPasswordResetSms(user.phone || "", code);
      return successMessage;
    }

    await sendPasswordResetCodeEmail(user, code, resetUrl);
    return successMessage;
  }

  @Mutation(() => String)
  async resetPassword(
    @Arg("email") email: string,
    @Arg("token") token: string,
    @Arg("password") password: string
  ) {
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (trimmedPassword.length < 6) {
      throw new Error(
        "Le nouveau mot de passe doit contenir au moins 6 caractères."
      );
    }

    const user = await User.findOneBy({
      email: normalizedEmail,
      passwordResetToken: hashResetToken(token.trim()),
    });

    if (
      !user ||
      !user.passwordResetTokenExpiresAt ||
      user.passwordResetTokenExpiresAt.getTime() < Date.now()
    ) {
      throw new Error("Lien de recuperation invalide ou expire.");
    }

    user.hashedPassword = await bcrypt.hash(trimmedPassword, 10);
    user.passwordResetToken = null;
    user.passwordResetTokenExpiresAt = null;
    await user.save();

    return "Mot de passe mis à jour. Vous pouvez vous connecter.";
  }

  @Mutation(() => String)
  async resetPasswordWithCode(
    @Arg("email") email: string,
    @Arg("code") code: string,
    @Arg("password") password: string
  ) {
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedCode = code.trim();
    const trimmedPassword = password.trim();

    if (!/^\d{6}$/.test(trimmedCode)) {
      throw new Error("Le code doit contenir exactement 6 chiffres.");
    }

    if (trimmedPassword.length < 6) {
      throw new Error(
        "Le nouveau mot de passe doit contenir au moins 6 caractères."
      );
    }

    const user = await User.findOneBy({
      email: normalizedEmail,
      passwordResetCode: hashResetToken(trimmedCode),
    });

    if (
      !user ||
      !user.passwordResetCodeExpiresAt ||
      user.passwordResetCodeExpiresAt.getTime() < Date.now()
    ) {
      throw new Error("Code de récupération invalide ou expire.");
    }

    user.hashedPassword = await bcrypt.hash(trimmedPassword, 10);
    user.passwordResetToken = null;
    user.passwordResetTokenExpiresAt = null;
    user.passwordResetCode = null;
    user.passwordResetCodeExpiresAt = null;
    await user.save();

    return "Mot de passe mis à jour. Vous pouvez vous connecter.";
  }

  // =========================
  // WHO AM I
  // =========================
  @Query(() => UserInfo)
  async whoAmI(@Ctx() context: Context) {
    if (!context.id) {
      return { isLoggedIn: false };
    }

    const user = await User.findOneBy({ id: context.id });

    if (!user) {
      return { isLoggedIn: false };
    }

    return {
      isLoggedIn: true,
      email: user.email,
      firstname: user.firstname,
      lastname: user.lastname,
      phone: user.phone,
      address: user.address,
      avatarUrl: user.avatarUrl,
      role: user.role,
    };
  }
}

export default UserResolver;
