"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RetroNoteRow } from "@/lib/types";

// Live retro notes for one sprint, so the whole team sees notes appear during
// the meeting. See use-board-realtime.ts for why setAuth is called by hand.
export function useRetroRealtime({
  sprintId,
  onUpsert,
  onDelete,
}: {
  sprintId: string;
  onUpsert: (note: RetroNoteRow) => void;
  onDelete: (id: string) => void;
}) {
  const handlers = useRef({ onUpsert, onDelete });
  useEffect(() => {
    handlers.current = { onUpsert, onDelete };
  });

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      supabase.realtime.setAuth(session?.access_token ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      supabase.realtime.setAuth(session?.access_token ?? null);

      channel = supabase
        .channel(`retro:${sprintId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "retro_notes", filter: `sprint_id=eq.${sprintId}` },
          (payload) => handlers.current.onUpsert(payload.new as RetroNoteRow)
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "retro_notes", filter: `sprint_id=eq.${sprintId}` },
          (payload) => handlers.current.onUpsert(payload.new as RetroNoteRow)
        )
        // Delete events only carry the id, so they can't be filtered by
        // sprint; ids from other sprints simply match nothing locally.
        .on("postgres_changes", { event: "DELETE", schema: "public", table: "retro_notes" }, (payload) => {
          const id = (payload.old as { id?: string }).id;
          if (id) handlers.current.onDelete(id);
        })
        .subscribe();
    });

    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
      if (channel) supabase.removeChannel(channel);
    };
  }, [sprintId]);
}
