import { notFound, unauthorized } from "next/navigation";
import { getUserAccounts, getUser } from "lib/user/server";
import { UserDetail } from "@/components/user/user-detail/user-detail";
import {
  UserStatsCardLoader,
  UserStatsCardLoaderSkeleton,
} from "@/components/user/user-detail/user-stats-card-loader";

import { Suspense } from "react";
import { getSupabaseUser } from "@/lib/supabase/auth-helpers";
import { requireAdminPermission } from "auth/permissions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function UserDetailPage({ params }: PageProps) {
  const { id } = await params;
  try {
    await requireAdminPermission();
  } catch (_error) {
    unauthorized();
  }
  // Middleware already handles auth redirect
  const user = await getSupabaseUser();

  const [targetUser, userAccountInfo] = await Promise.all([
    getUser(id),
    getUserAccounts(id),
  ]);

  if (!targetUser) {
    notFound();
  }

  return (
    <UserDetail
      user={targetUser}
      currentUserId={user!.id}
      userAccountInfo={userAccountInfo}
      userStatsSlot={
        <Suspense fallback={<UserStatsCardLoaderSkeleton />}>
          <UserStatsCardLoader userId={id} view="admin" />
        </Suspense>
      }
      view="admin"
    />
  );
}
