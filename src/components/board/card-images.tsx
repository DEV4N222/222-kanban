"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import type { CardAttachmentRow } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ImagePlus, Loader2, X } from "lucide-react";

const BUCKET = "card-images";
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];
const SIGNED_URL_SECONDS = 60 * 60;

type Attachment = CardAttachmentRow & { url: string | null };

export function CardImages({ cardId, boardId }: { cardId: string; boardId: string }) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [viewing, setViewing] = useState<Attachment | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    (async () => {
      const { data } = await supabase
        .from("card_attachments")
        .select("*")
        .eq("card_id", cardId)
        .order("created_at", { ascending: true });
      const rows = data ?? [];
      const urls = await signedUrls(rows.map((r) => r.path));
      if (!cancelled) setAttachments(rows.map((r) => ({ ...r, url: urls.get(r.path) ?? null })));
    })();
    return () => {
      cancelled = true;
    };
  }, [cardId]);

  const upload = useCallback(
    async (files: File[]) => {
      const images = files.filter((f) => ALLOWED_TYPES.includes(f.type));
      if (images.length < files.length) {
        toast.error("Only PNG, JPEG, GIF and WebP images can be added.");
      }
      const tooBig = images.filter((f) => f.size > MAX_BYTES);
      if (tooBig.length > 0) {
        toast.error(`${tooBig.map((f) => f.name).join(", ")} ${tooBig.length === 1 ? "is" : "are"} over 10 MB.`);
      }
      const accepted = images.filter((f) => f.size <= MAX_BYTES);
      if (accepted.length === 0) return;

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUploading((n) => n + accepted.length);
      for (const file of accepted) {
        try {
          const ext = file.type.split("/")[1].replace("jpeg", "jpg");
          const path = `${boardId}/${cardId}/${crypto.randomUUID()}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from(BUCKET)
            .upload(path, file, { contentType: file.type });
          if (uploadError) throw uploadError;

          const { data: row, error: rowError } = await supabase
            .from("card_attachments")
            .insert({
              card_id: cardId,
              board_id: boardId,
              path,
              name: file.name,
              mime_type: file.type,
              size: file.size,
              created_by: user?.id ?? null,
            })
            .select("*")
            .single();
          if (rowError || !row) {
            await supabase.storage.from(BUCKET).remove([path]);
            throw rowError ?? new Error("Could not save image.");
          }

          const urls = await signedUrls([path]);
          setAttachments((prev) => [...prev, { ...row, url: urls.get(path) ?? null }]);
        } catch (error) {
          toast.error(`Could not upload ${file.name}`, {
            description: error instanceof Error ? error.message : undefined,
          });
        } finally {
          setUploading((n) => n - 1);
        }
      }
    },
    [boardId, cardId]
  );

  // Paste anywhere in the open card (including the description box) adds the
  // image; text pastes are left alone.
  useEffect(() => {
    function handlePaste(event: ClipboardEvent) {
      const files = [...(event.clipboardData?.files ?? [])].filter((f) => f.type.startsWith("image/"));
      if (files.length === 0) return;
      event.preventDefault();
      const stamp = format(new Date(), "yyyy-MM-dd HH.mm.ss");
      upload(
        files.map((f, i) =>
          f.name && f.name !== "image.png"
            ? f
            : new File([f], `Pasted image ${stamp}${i ? ` (${i + 1})` : ""}.${f.type.split("/")[1]}`, {
                type: f.type,
              })
        )
      );
    }
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [upload]);

  async function remove(attachment: Attachment) {
    setAttachments((prev) => prev.filter((a) => a.id !== attachment.id));
    if (viewing?.id === attachment.id) setViewing(null);
    const supabase = createClient();
    const { error } = await supabase.from("card_attachments").delete().eq("id", attachment.id);
    if (error) {
      setAttachments((prev) => [...prev, attachment].sort((a, b) => a.created_at.localeCompare(b.created_at)));
      toast.error("Could not delete image", { description: error.message });
      return;
    }
    await supabase.storage.from(BUCKET).remove([attachment.path]);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Images</Label>
        <Button variant="ghost" size="sm" onClick={() => inputRef.current?.click()}>
          <ImagePlus className="size-4" />
          Add image
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_TYPES.join(",")}
          multiple
          hidden
          onChange={(e) => {
            upload([...(e.target.files ?? [])]);
            e.target.value = "";
          }}
        />
      </div>

      <div
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          upload([...e.dataTransfer.files]);
        }}
        className={cn(
          "rounded-lg border border-dashed p-2 transition-colors",
          dragging && "border-primary bg-primary/5"
        )}
      >
        {attachments.length > 0 || uploading > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {attachments.map((attachment) => (
              <div key={attachment.id} className="group relative aspect-square overflow-hidden rounded-md border bg-muted">
                <button
                  type="button"
                  className="size-full"
                  onClick={() => setViewing(attachment)}
                  aria-label={`View ${attachment.name}`}
                >
                  {attachment.url && (
                    // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
                    <img src={attachment.url} alt={attachment.name} className="size-full object-cover" />
                  )}
                </button>
                <Button
                  variant="secondary"
                  size="icon-sm"
                  className="absolute top-1 right-1 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                  onClick={() => remove(attachment)}
                  aria-label={`Delete ${attachment.name}`}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            ))}
            {Array.from({ length: uploading }, (_, i) => (
              <div
                key={`uploading-${i}`}
                className="flex aspect-square items-center justify-center rounded-md border bg-muted"
              >
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            ))}
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Drop, paste (Ctrl+V) or add an image
          </p>
        )}
      </div>

      <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="sm:max-w-4xl">
          <DialogTitle className="truncate pr-8 text-sm">{viewing?.name}</DialogTitle>
          {viewing?.url && (
            // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
            <img src={viewing.url} alt={viewing.name} className="max-h-[75vh] w-full rounded-md object-contain" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

async function signedUrls(paths: string[]): Promise<Map<string, string>> {
  if (paths.length === 0) return new Map();
  const { data } = await createClient().storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_SECONDS);
  return new Map((data ?? []).flatMap((d) => (d.path && d.signedUrl ? [[d.path, d.signedUrl]] : [])));
}
