import { archiveRepository } from "lib/db/repository";
import { getSupabaseUser } from "@/lib/supabase/auth-helpers";
import { z } from "zod";
import { ArchiveCreateSchema } from "app-types/archive";

export async function GET() {
  const user = await getSupabaseUser();

  if (!user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const archives = await archiveRepository.getArchivesByUserId(user.id);
    return Response.json(archives);
  } catch (error) {
    console.error("Failed to fetch archives:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getSupabaseUser();

  if (!user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const body = await request.json();
    const data = ArchiveCreateSchema.parse(body);

    const archive = await archiveRepository.createArchive({
      name: data.name,
      description: data.description || null,
      userId: user.id,
    });

    return Response.json(archive);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Invalid input", details: error.message },
        { status: 400 },
      );
    }

    console.error("Failed to create archive:", error);
    return Response.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
