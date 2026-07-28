import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission, isAdminRole, isCustomerRole, PERMISSIONS } from "@/lib/rbac";
import { createPresignedUpload } from "@/lib/storage";

const PROFILE_FOLDERS = new Set(["avatars", "covers", "logos", "products", "splash"]);

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const contentType = typeof body?.contentType === "string" ? body.contentType : null;
  const folder = typeof body?.folder === "string" ? body.folder : null;

  if (!contentType || !folder) {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  let storageFolder: string;

  if (folder === "attachments") {
    // Notification attachments (§4.7) — needs messages.send, not profile-edit access.
    if (!isAdminRole(user.role) || !hasPermission(user, PERMISSIONS.MESSAGES_SEND)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }
    storageFolder = `attachments/${user.id}`;
  } else if (PROFILE_FOLDERS.has(folder)) {
    const targetUserId = typeof body?.targetUserId === "string" ? body.targetUserId : null;
    if (!targetUserId) {
      return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
    }
    const authorized =
      (user.id === targetUserId && isCustomerRole(user.role)) ||
      (isAdminRole(user.role) && hasPermission(user, PERMISSIONS.PROFILES_EDIT_ON_BEHALF));
    if (!authorized) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }
    storageFolder = `${folder}/${targetUserId}`;
  } else {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const result = await createPresignedUpload({ contentType, folder: storageFolder });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json(result);
}
