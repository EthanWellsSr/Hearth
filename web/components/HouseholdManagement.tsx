"use client";

import { useState } from "react";
import {
  leaveHousehold,
  setHouseholdTimezone,
  transferOwnership,
} from "@/app/people/actions";
import { TimezoneField } from "./TimezoneField";

type TransferOption = { membershipId: string; name: string };

export function OwnerHouseholdManagement({
  currentTimeZone,
  transferOptions,
}: {
  currentTimeZone: string;
  transferOptions: TransferOption[];
}) {
  const [target, setTarget] = useState(transferOptions[0]?.membershipId || "");
  const targetName = transferOptions.find((option) => option.membershipId === target)?.name;

  return (
    <section className="card botanical-card flex flex-col gap-6 p-5 sm:p-6">
      <div>
        <p className="page-kicker">Household management</p>
        <h2 className="text-lg font-semibold text-stone-800">Settings and ownership</h2>
      </div>

      <form
        action={setHouseholdTimezone}
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          const next = String(new FormData(event.currentTarget).get("timezone") || "");
          if (next !== currentTimeZone && !window.confirm(
            `Change the Household timezone from ${currentTimeZone} to ${next}? Timed Events will display in the new timezone. All-day Events will stay on their selected dates.`
          )) event.preventDefault();
        }}
      >
        <TimezoneField initialTimeZone={currentTimeZone} />
        <button type="submit" className="btn-primary self-start">Save timezone</button>
      </form>

      <div className="soft-divider" />

      <div>
        <h3 className="font-semibold text-stone-800">Transfer ownership</h3>
        <p className="mt-1 text-sm leading-6 text-stone-500">
          You will become a regular Member. You may leave afterward if needed.
        </p>
        {transferOptions.length ? (
          <form
            action={transferOwnership}
            className="mt-3 flex flex-col gap-3"
            onSubmit={(event) => {
              if (!window.confirm(`Make ${targetName || "this Member"} the owner of this Household?`)) {
                event.preventDefault();
              }
            }}
          >
            <select
              name="membership_id"
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              className="field w-full"
              required
            >
              {transferOptions.map((option) => (
                <option key={option.membershipId} value={option.membershipId}>{option.name}</option>
              ))}
            </select>
            <button type="submit" className="btn-ghost self-start border border-amber-200 bg-amber-50 text-amber-900">
              Transfer ownership
            </button>
          </form>
        ) : (
          <p className="mt-3 text-sm text-stone-400">Invite another Member before transferring ownership.</p>
        )}
      </div>
    </section>
  );
}

export function MemberHouseholdManagement() {
  return (
    <section className="card flex flex-col gap-4 border-red-100 p-5 sm:p-6">
      <div>
        <p className="page-kicker">Household management</p>
        <h2 className="text-lg font-semibold text-stone-800">Leave this Household</h2>
        <p className="mt-1 text-sm leading-6 text-stone-500">
          Your Events remain. Assigned Chores and To-dos become Unassigned, and the Invite Code rotates.
        </p>
      </div>
      <form
        action={leaveHousehold}
        onSubmit={(event) => {
          if (!window.confirm("Leave this Household? You will need a new Invitation Link to return.")) {
            event.preventDefault();
          }
        }}
      >
        <button type="submit" className="btn-ghost border border-red-200 bg-red-50 text-red-700 hover:text-red-800">
          Leave Household
        </button>
      </form>
    </section>
  );
}

