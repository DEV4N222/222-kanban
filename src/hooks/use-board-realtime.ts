"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ColumnRow, CardWithLabels } from "@/lib/types";

type Options = {
  boardId: string;
  onColumnUpsert: (row: ColumnRow) => void;
  onColumnDelete: (id: string) => void;
  onCardUpsert: (row: CardWithLabels) => void;
  onCardDelete: (id: string) => void;
};

// Subscribes to live changes on this board so every open tab (this user's
// or a teammate's) converges without a manual refresh.
export function useBoardRealtime({
  boardId,
  onColumnUpsert,
  onColumnDelete,
  onCardUpsert,
  onCardDelete,
}: Options) {
  const handlers = useRef({ onColumnUpsert, onColumnDelete, onCardUpsert, onCardDelete });
  useEffect(() => {
    handlers.current = { onColumnUpsert, onColumnDelete, onCardUpsert, onCardDelete };
  });

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    // @supabase/ssr's browser client picks up an existing session from
    // cookies on mount, which fires an `INITIAL_SESSION` auth event rather
    // than `SIGNED_IN`/`TOKEN_REFRESHED` — the only two events supabase-js's
    // internal listener uses to call `realtime.setAuth()`. Without that
    // call, the Realtime websocket authenticates as `apikey`-only (anon),
    // so every RLS policy scoped `to authenticated` silently drops all
    // postgres_changes events. Set it explicitly before subscribing, and
    // keep it current on refresh.
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      supabase.realtime.setAuth(session?.access_token ?? null);
    });

    let channel: ReturnType<typeof supabase.channel> | null = null;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      supabase.realtime.setAuth(session?.access_token ?? null);

      channel = supabase
        .channel(`board:${boardId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "columns", filter: `board_id=eq.${boardId}` },
          (payload) => {
            if (payload.eventType === "DELETE") {
              handlers.current.onColumnDelete((payload.old as ColumnRow).id);
            } else {
              handlers.current.onColumnUpsert(payload.new as ColumnRow);
            }
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "cards", filter: `board_id=eq.${boardId}` },
          (payload) => {
            if (payload.eventType === "DELETE") {
              handlers.current.onCardDelete((payload.old as { id: string }).id);
              return;
            }
            const row = payload.new as CardWithLabels;
            if (row.archived) {
              handlers.current.onCardDelete(row.id);
            } else {
              handlers.current.onCardUpsert({ ...row, label_ids: row.label_ids ?? [] });
            }
          }
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
      if (channel) supabase.removeChannel(channel);
    };
  }, [boardId]);
}
