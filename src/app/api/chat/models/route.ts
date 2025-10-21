import { getModelsInfo } from "@/services/model-service";

export const GET = async () => {
  return Response.json(getModelsInfo());
};
