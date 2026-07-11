import { Download, FileText, Paperclip } from "lucide-react";
import type { PostAttachment } from "@workspace/api-client-react";
import { attachmentSrc } from "@/lib/storage";
import { useLanguage } from "@/contexts/LanguageContext";

export function PostAttachments({
  attachments,
}: {
  attachments?: PostAttachment[] | null;
}) {
  const { t } = useLanguage();
  if (!attachments || attachments.length === 0) return null;

  const images = attachments.filter((a) => a.type === "image");
  const videos = attachments.filter((a) => a.type === "video");
  const files = attachments.filter((a) => a.type === "file");

  return (
    <div className="max-w-3xl mx-auto mb-16 space-y-6">
      <h3 className="text-2xl font-serif font-bold flex items-center gap-3">
        <Paperclip className="w-6 h-6 text-primary" />
        {t("post.attachments")}
        <span className="text-base font-normal text-muted-foreground">
          ({attachments.length})
        </span>
      </h3>

      {images.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {images.map((a, i) => (
            <a
              key={`img-${i}`}
              href={attachmentSrc(a.url)}
              target="_blank"
              rel="noreferrer"
              className="group block aspect-[4/3] rounded-2xl overflow-hidden border border-border/40 bg-muted/30 shadow-lg"
            >
              <img
                src={attachmentSrc(a.url)}
                alt={a.name || ""}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </a>
          ))}
        </div>
      )}

      {videos.map((a, i) => (
        <div
          key={`vid-${i}`}
          className="rounded-2xl overflow-hidden border border-border/40 bg-black shadow-lg"
        >
          <video
            src={attachmentSrc(a.url)}
            controls
            preload="metadata"
            className="w-full h-auto max-h-[70vh]"
          />
        </div>
      ))}

      {files.length > 0 && (
        <div className="space-y-3">
          {files.map((a, i) => (
            <a
              key={`file-${i}`}
              href={attachmentSrc(a.url)}
              download
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 p-4 rounded-2xl border border-border/40 glass hover:border-primary/40 transition-colors"
            >
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <span className="flex-1 min-w-0 truncate font-semibold text-sm text-foreground">
                {a.name || a.url.split("/").pop()}
              </span>
              <Download className="w-4 h-4 opacity-60 shrink-0" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
