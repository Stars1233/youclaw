import { Message as AIMessage } from "@/components/ai-elements/message";
import {
  Attachments,
  Attachment,
  AttachmentPreview,
  AttachmentInfo,
} from "@/components/ai-elements/attachments";
import type { Message } from "@/hooks/useChat";

export function UserMessage({ message }: { message: Message }) {
  const attachments = message.attachments ?? [];

  return (
    <AIMessage from="user" data-testid="message-user">
      <div className="flex flex-col items-end py-2">
        <div className="max-w-[80%] bg-primary text-primary-foreground rounded-2xl rounded-tr-md px-4 py-2.5">
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {message.content}
          </p>
        </div>
        <span className="text-[10px] text-muted-foreground/60 mt-1 mr-1">
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        {attachments.length > 0 && (
          <Attachments variant="grid" className="mt-2 ml-0">
            {attachments.map((a, i) => (
              <Attachment
                key={i}
                data={{
                  id: String(i),
                  type: "file" as const,
                  filename: a.filename,
                  mediaType: a.mediaType,
                  url: `data:${a.mediaType};base64,${a.data}`,
                }}
              >
                <AttachmentPreview />
                <AttachmentInfo />
              </Attachment>
            ))}
          </Attachments>
        )}
      </div>
    </AIMessage>
  );
}
