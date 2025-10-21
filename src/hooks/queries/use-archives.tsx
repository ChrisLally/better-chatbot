import { appStore } from "@/app/store";
import { ArchiveWithItemCount } from "app-types/archive";
import useSWR from "swr";
import { getArchivesAction } from "@/app/actions/archive-actions";

export const useArchives = () => {
  return useSWR<ArchiveWithItemCount[]>("archives", getArchivesAction, {
    fallbackData: [],
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    onSuccess: (data) => {
      appStore.setState({
        archiveList: data,
      });
    },
  });
};
