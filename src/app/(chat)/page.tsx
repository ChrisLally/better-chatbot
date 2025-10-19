import ChatBot from "@/components/chat-bot";
import { generateUUID } from "lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Middleware already handles auth redirect
  const id = generateUUID();
  return <ChatBot initialMessages={[]} threadId={id} key={id} />;
}
