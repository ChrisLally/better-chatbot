"use client";
import { appStore } from "@/app/store";
import { ArchiveWithItemCount } from "app-types/archive";
import useSWR from "swr";
import { getArchivesAction } from "@/app/actions/archive-actions";
import { useAuth } from "@/context/auth-context";

export const useArchives = () => {
  const { user } = useAuth();

  return useSWR<ArchiveWithItemCount[]>(
    user ? "archives" : null,
    async () => {
      if (!user) {
        return [];
      }
      return await getArchivesAction();
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
