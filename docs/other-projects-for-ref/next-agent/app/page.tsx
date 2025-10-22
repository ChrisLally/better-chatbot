"use client";

import { useChat } from "@ai-sdk/react";
import ChatInput from "@/component/chat-input";
import type { WeatherAgentUIMessage } from "@/agent/weather-agent";
import WeatherView from "@/component/weather-view";

export default function Chat() {
  const { status, sendMessage, messages } = useChat<WeatherAgentUIMessage>();

  return (
    <div className="flex flex-col py-24 mx-auto w-full max-w-md stretch">
      {messages?.map((message, _messageIndex) => (
        <div key={message.id} className="whitespace-pre-wrap">
          <strong>{`${message.role}: `}</strong>
          {message.parts.map((part, partIndex) => {
            const partKey = `${message.id}-part-${partIndex}`;
            switch (part.type) {
              case "text":
                return <div key={partKey}>{part.text}</div>;

              case "step-start":
                return partIndex > 0 ? (
                  <div key={partKey} className="text-gray-500">
                    <hr className="my-2 border-gray-300" />
                  </div>
                ) : null;

              case "tool-weather": {
                return <WeatherView key={partKey} invocation={part} />;
              }
            }
          })}
          <br />
        </div>
      ))}

      <ChatInput status={status} onSubmit={(text) => sendMessage({ text })} />
    </div>
  );
}
