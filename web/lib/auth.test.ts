import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cacheGeneration: 0,
  createSupabaseServerClient: vi.fn(),
  pendingInviteCode: vi.fn(async () => null),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    cache: <Result,>(fn: () => Result) => {
      let result: Result;
      let called = false;
      let generation = -1;
      return () => {
        if (generation !== mocks.cacheGeneration) {
          generation = mocks.cacheGeneration;
          called = false;
        }
        if (!called) {
          result = fn();
          called = true;
        }
        return result;
      };
    },
  };
});

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("./pending-invite", () => ({ pendingInviteCode: mocks.pendingInviteCode }));
vi.mock("./supabase-server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));

import { requireHousehold, requireProfile } from "./auth";

function supabaseFixture() {
  const events: string[] = [];
  const getClaims = vi.fn(async () => ({
    data: { claims: { sub: "user-1", email: "ethan@example.com" } },
    error: null,
  }));
  const from = vi.fn((table: string) => {
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      maybeSingle: vi.fn(async () => {
        events.push(`${table}-start`);
        await Promise.resolve();
        events.push(`${table}-resolved`);

        if (table === "user_profiles") {
          return {
            data: {
              user_id: "user-1",
              display_name: "Ethan",
              avatar_path: null,
              setup_completed: true,
            },
          };
        }

        return {
          data: {
            id: "membership-1",
            household_id: "household-1",
            role: "owner",
            household: { timezone: "America/Chicago" },
          },
        };
      }),
    };
    return query;
  });

  return {
    client: { auth: { getClaims }, from },
    events,
    from,
    getClaims,
  };
}

describe("request auth context", () => {
  beforeEach(() => {
    mocks.cacheGeneration += 1;
    vi.clearAllMocks();
  });

  it("deduplicates User and User Profile loading across page and header", async () => {
    const fixture = supabaseFixture();
    mocks.createSupabaseServerClient.mockResolvedValue(fixture.client);

    await Promise.all([requireHousehold(), requireProfile()]);

    expect(mocks.createSupabaseServerClient).toHaveBeenCalledTimes(1);
    expect(fixture.getClaims).toHaveBeenCalledTimes(1);
    expect(fixture.from.mock.calls.filter(([table]) => table === "user_profiles")).toHaveLength(1);
  });

  it("deduplicates Household context loading within one request", async () => {
    const fixture = supabaseFixture();
    mocks.createSupabaseServerClient.mockResolvedValue(fixture.client);

    await Promise.all([requireHousehold(), requireHousehold()]);

    expect(fixture.from.mock.calls.filter(([table]) => table === "memberships")).toHaveLength(1);
  });

  it("loads the User Profile and Membership concurrently", async () => {
    const fixture = supabaseFixture();
    mocks.createSupabaseServerClient.mockResolvedValue(fixture.client);

    await requireHousehold();

    expect(fixture.events.indexOf("memberships-start")).toBeLessThan(
      fixture.events.indexOf("user_profiles-resolved")
    );
  });
});
