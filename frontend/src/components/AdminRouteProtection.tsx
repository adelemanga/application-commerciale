import { useContext } from "react";
import { useRouter } from "next/router";
import { UserContext } from "./Layout";
import { Role } from "../interface/types";

function AdminRouteProtection({ children }: { children: React.ReactNode }) {
  const userInfo = useContext(UserContext);
  const router = useRouter();

  if (!userInfo.isLoggedIn || userInfo.role !== Role.Admin) {
    router.replace("/");
    return null;
  }

  return <>{children}</>;
}

export default AdminRouteProtection;
