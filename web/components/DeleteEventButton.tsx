"use client";

import { deleteEvent } from "@/app/calendar/actions";
import { FormSubmitButton } from "./FormSubmitButton";

export function DeleteEventButton({ id, title }: { id: string; title: string }) {
  return (
    <form
      action={deleteEvent}
      onSubmit={(event) => {
        if (!window.confirm(`Delete “${title}”? This cannot be undone.`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <FormSubmitButton
        pendingChildren="Deleting…"
        className="btn-ghost text-red-700 hover:bg-red-50 hover:text-red-800"
      >
        Delete Event
      </FormSubmitButton>
    </form>
  );
}
