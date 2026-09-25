import type { Database } from "@/lib/db/types";

export type {
  SprintStatus,
  WorkspaceRole,
  InviteRole,
  CardEventType,
  RaidType,
  RaidStatus,
  RaidLevel,
} from "@/lib/db/types";
export type ColumnRow = Database["public"]["Tables"]["columns"]["Row"];
export type LabelRow = Database["public"]["Tables"]["labels"]["Row"];
export type SprintRow = Database["public"]["Tables"]["sprints"]["Row"];
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type CardEventRow = Database["public"]["Tables"]["card_events"]["Row"];
export type CardRow = Database["public"]["Tables"]["cards"]["Row"];
export type CardAttachmentRow = Database["public"]["Tables"]["card_attachments"]["Row"];
export type RaidItemRow = Database["public"]["Tables"]["raid_items"]["Row"];

export type CardWithLabels = Database["public"]["Tables"]["cards"]["Row"] & {
  label_ids: string[];
};

export type MemberWithProfile = {
  user_id: string;
  role: string;
  profiles: Pick<ProfileRow, "id" | "name" | "avatar_url"> | null;
};
