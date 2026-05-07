import {
  Mutation,
  Arg,
  Query,
  Ctx,
  ObjectType,
  Field,
} from "type-graphql";
import bcrypt from "bcryptjs";
import { Role, User } from "../entities/User";
import jwt from "jsonwebtoken";
import { Context } from "../../src";

const buildAuthCookie = (token: string, maxAge = 60 * 60 * 24 * 7) => {
  const secureFlag = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `token=${token}; Max-Age=${maxAge}; HttpOnly; SameSite=Lax; Path=/${secureFlag}`;
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

    const userFromDB = await User.findOneByOrFail({
      email: emailFromClient,
    });

    const isPasswordCorrect = await bcrypt.compare(
      passwordFromClient,
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
    } catch (err) {
      console.error(err);
      throw new Error("Connexion client refusee");
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
    } catch (err) {
      console.error(err);
      throw new Error("Connexion administrateur refusee");
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
      throw new Error("Un compte existe deja avec cet email.");
    }

    // HASH PASSWORD (bcrypt FIX IMPORTANT)
    const hashedPassword = await bcrypt.hash(password, 10);

    const userFromDB = await User.save({
      email: normalizedEmail,
      firstname: firstname.trim(),
      lastname: lastname.trim(),
      phone: phone?.trim(),
      address: address?.trim(),
      avatarUrl,
      hashedPassword,
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

    const hashedPassword = await bcrypt.hash(password, 10);

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

  // =========================
  // WHO AM I
  // =========================
  @Query(() => UserInfo)
  async whoAmI(@Ctx() context: Context) {
    if (!context.id) {
      return { isLoggedIn: false };
    }

    const user = await User.findOneByOrFail({ id: context.id });

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
