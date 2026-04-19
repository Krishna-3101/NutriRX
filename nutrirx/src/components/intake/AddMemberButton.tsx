"use client";

import { Button } from "@/components/ui/Button";
import { Plus } from "lucide-react";

interface AddMemberButtonProps {
  onClick: () => void;
}

export function AddMemberButton({ onClick }: AddMemberButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      className="w-full border border-dashed border-border text-text-secondary hover:border-border-strong hover:text-text-primary"
      onClick={onClick}
    >
      <Plus className="h-4 w-4" />
      Add family member
    </Button>
  );
}
