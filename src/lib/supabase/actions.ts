import "server-only";
import { createClient } from "./server";
import { z } from "zod";
import { UpdateUserDetailsSchema } from "@/app/api/user/validations";

export async function updateUser(
  userId: string,
  data: Partial<z.infer<typeof UpdateUserDetailsSchema>>,
) {
  const supabase = await createClient();
  const { name, email, image } = data;

  const userUpdatePayload: {
    email?: string;
    user_metadata?: { [key: string]: any };
  } = {};

  if (email) {
    userUpdatePayload.email = email;
  }

  const metadata: { [key: string]: any } = {};
  if (name) {
    metadata.name = name;
  }
  if (image) {
    metadata.image = image;
  }

  if (Object.keys(metadata).length > 0) {
    userUpdatePayload.user_metadata = metadata;
  }

  if (Object.keys(userUpdatePayload).length === 0) {
    // Nothing to update
    return;
  }

  const { error } = await supabase.auth.admin.updateUserById(
    userId,
    userUpdatePayload,
  );

  if (error) throw error;
}

export async function updateUserRole(userId: string, role: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: { role },
  });
  if (error) throw error;
}

export async function updateUserBanStatus(
  userId: string,
  banned: boolean,
  banReason?: string,
) {
  const supabase = await createClient();
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    ban_duration: banned ? "none" : "0s",
    user_metadata: {
      banned,
      banReason: banned ? banReason : null,
    },
  });
  if (error) throw error;
}

export async function deleteUser(userId: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) throw error;
}

export async function updateUserPassword(
  userId: string,
  newPassword_ext: string,
) {
  const supabase = await createClient();
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    password: newPassword_ext,
  });
  if (error) throw error;
}
