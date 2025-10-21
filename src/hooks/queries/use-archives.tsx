import { appStore } from "@/app/store";
import { ArchiveWithItemCount } from "app-types/archive";
import useSWR from "swr";
import { getArchivesWithItemCount } from "@/services/supabase/archive-service";
import { getSupabaseUser } from "@/lib/supabase/auth-helpers";

export const useArchives = () => {
  return useSWR<ArchiveWithItemCount[]>(
    "archives",
    async () => {
      const user = await getSupabaseUser();
      if (!user) {
        return [];
      }
      return await getArchivesWithItemCount(user.id);
    },
    {
      fallbackData: [],
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      onSuccess: (data) => {
        appStore.setState({
          archiveList: data,
        });
      },
    },
  );
};
