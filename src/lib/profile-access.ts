import "server-only";
import { redirect } from "next/navigation";
import { requireUser, type CurrentUser } from "@/lib/auth";
import { hasPermission, isAdminRole, isCustomerRole, PERMISSIONS } from "@/lib/rbac";

/**
 * Authorizes editing a customer page's data, whether the editor is the
 * account owner themselves, or an admin with "edit on behalf" permission
 * (spec §4.6). Every shared profile/product/coupon/publish server action
 * calls this first so both dashboards can reuse the exact same actions.
 */
export async function authorizeProfileEdit(targetUserId: string): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.id === targetUserId && isCustomerRole(user.role)) return user;
  if (isAdminRole(user.role) && hasPermission(user, PERMISSIONS.PROFILES_EDIT_ON_BEHALF)) return user;
  redirect("/login");
}

export async function requireOwnCustomerAccount(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!isCustomerRole(user.role)) redirect("/admin");
  return user;
}

/**
 * Authorizes the publish action specifically. §4.8 makes "review & publish"
 * its own independent admin permission, separate from full edit-on-behalf
 * access (§4.6) — a sub-admin can hold one without the other, so publishing
 * must accept either.
 */
export async function authorizePublish(targetUserId: string): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.id === targetUserId && isCustomerRole(user.role)) return user;
  if (
    isAdminRole(user.role) &&
    (hasPermission(user, PERMISSIONS.PROFILES_EDIT_ON_BEHALF) ||
      hasPermission(user, PERMISSIONS.CHANGES_REVIEW_PUBLISH))
  ) {
    return user;
  }
  redirect("/login");
}
