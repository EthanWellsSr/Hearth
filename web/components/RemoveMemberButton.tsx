"use client";

import { removeMember } from "@/app/people/actions";
import { FormSubmitButton } from "./FormSubmitButton";

export function RemoveMemberButton({ membershipId, name }: { membershipId: string; name: string }) {
  return (
    <form
      action={removeMember}
      onSubmit={(event) => {
        if (!window.confirm(`Remove ${name} from this Household? Their Chores and To-dos will become Unassigned, their Events will remain, and the Invite Code will rotate.`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="membership_id" value={membershipId} />
      <FormSubmitButton pendingChildren="Removing…" className="btn-ghost min-h-9 px-3 text-xs text-red-700 hover:bg-red-50 hover:text-red-800">
        Remove
      </FormSubmitButton>
    </form>
  );
}
