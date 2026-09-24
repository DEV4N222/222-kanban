"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Check, Link2 } from "lucide-react";

export function CopyInviteLink({ token, email }: { token: string; email: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = `${window.location.origin}/invite/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Invite link copied", { description: `Send it to ${email}.` });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this invite link:", url);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={copy}>
      {copied ? <Check className="size-4" /> : <Link2 className="size-4" />}
      {copied ? "Copied" : "Copy link"}
    </Button>
  );
}
