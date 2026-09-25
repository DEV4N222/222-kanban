// Hand-written to match supabase/migrations/0001_init.sql, following the
// same shape `supabase gen types typescript` produces. Once the project is
// linked to a real Supabase project, prefer regenerating this with:
//   npx supabase gen types typescript --project-id <id> > src/lib/db/types.ts

export type WorkspaceRole = "owner" | "admin" | "member";
export type InviteRole = "admin" | "member";
export type SprintStatus = "planned" | "active" | "completed";
export type CardEventType =
  | "created"
  | "moved"
  | "archived"
  | "unarchived"
  | "sprint_added"
  | "sprint_removed";
export type RaidType = "risk" | "assumption" | "issue" | "decision";
export type RaidStatus = "open" | "in_progress" | "closed";
export type RaidLevel = "low" | "medium" | "high";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      workspaces: {
        Row: {
          id: string;
          name: string;
          owner_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          owner_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["workspaces"]["Insert"]>;
        Relationships: [];
      };
      workspace_members: {
        Row: {
          workspace_id: string;
          user_id: string;
          role: WorkspaceRole;
          created_at: string;
        };
        Insert: {
          workspace_id: string;
          user_id: string;
          role?: WorkspaceRole;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["workspace_members"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "workspace_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      invites: {
        Row: {
          id: string;
          workspace_id: string;
          email: string;
          role: InviteRole;
          token: string;
          invited_by: string | null;
          expires_at: string;
          accepted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          email: string;
          role?: InviteRole;
          token?: string;
          invited_by?: string | null;
          expires_at?: string;
          accepted_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["invites"]["Insert"]>;
        Relationships: [];
      };
      boards: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          created_at?: string;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["boards"]["Insert"]>;
        Relationships: [];
      };
      columns: {
        Row: {
          id: string;
          board_id: string;
          name: string;
          position: number;
          is_done: boolean;
          wip_limit: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          board_id: string;
          name: string;
          position?: number;
          is_done?: boolean;
          wip_limit?: number | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["columns"]["Insert"]>;
        Relationships: [];
      };
      labels: {
        Row: {
          id: string;
          board_id: string;
          name: string;
          color: string;
        };
        Insert: {
          id?: string;
          board_id: string;
          name: string;
          color?: string;
        };
        Update: Partial<Database["public"]["Tables"]["labels"]["Insert"]>;
        Relationships: [];
      };
      sprints: {
        Row: {
          id: string;
          board_id: string;
          name: string;
          start_date: string;
          end_date: string;
          goal: string | null;
          status: SprintStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          board_id: string;
          name: string;
          start_date: string;
          end_date: string;
          goal?: string | null;
          status?: SprintStatus;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["sprints"]["Insert"]>;
        Relationships: [];
      };
      cards: {
        Row: {
          id: string;
          board_id: string;
          column_id: string;
          sprint_id: string | null;
          title: string;
          description: string | null;
          position: number;
          assignee_id: string | null;
          due_date: string | null;
          archived: boolean;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          board_id: string;
          column_id: string;
          sprint_id?: string | null;
          title: string;
          description?: string | null;
          position?: number;
          assignee_id?: string | null;
          due_date?: string | null;
          archived?: boolean;
          created_at?: string;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["cards"]["Insert"]>;
        Relationships: [];
      };
      card_labels: {
        Row: {
          card_id: string;
          label_id: string;
        };
        Insert: {
          card_id: string;
          label_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["card_labels"]["Insert"]>;
        Relationships: [];
      };
      card_events: {
        Row: {
          id: string;
          card_id: string;
          board_id: string;
          event_type: CardEventType;
          from_column_id: string | null;
          to_column_id: string | null;
          sprint_id: string | null;
          actor_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          card_id: string;
          board_id: string;
          event_type: CardEventType;
          from_column_id?: string | null;
          to_column_id?: string | null;
          sprint_id?: string | null;
          actor_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["card_events"]["Insert"]>;
        Relationships: [];
      };
      card_attachments: {
        Row: {
          id: string;
          card_id: string;
          board_id: string;
          path: string;
          name: string;
          mime_type: string;
          size: number;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          card_id: string;
          board_id: string;
          path: string;
          name: string;
          mime_type: string;
          size: number;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["card_attachments"]["Insert"]>;
        Relationships: [];
      };
      raid_items: {
        Row: {
          id: string;
          board_id: string;
          type: RaidType;
          number: number;
          title: string;
          description: string | null;
          owner_id: string | null;
          status: RaidStatus;
          impact: RaidLevel | null;
          likelihood: RaidLevel | null;
          action: string | null;
          due_date: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          board_id: string;
          type: RaidType;
          number: number;
          title: string;
          description?: string | null;
          owner_id?: string | null;
          status?: RaidStatus;
          impact?: RaidLevel | null;
          likelihood?: RaidLevel | null;
          action?: string | null;
          due_date?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["raid_items"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_invite: {
        Args: { _token: string };
        Returns: string;
      };
      is_workspace_member: {
        Args: { _workspace_id: string };
        Returns: boolean;
      };
      is_workspace_admin: {
        Args: { _workspace_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
