export type GoogleChangePage = {
  items?: { id?: string }[];
  nextPageToken?: string;
  nextSyncToken?: string;
};

// The change feed is unbounded and unexpanded, separate from the date-bounded
// occurrence snapshot. Google forbids combining syncToken with time bounds.
export async function readGoogleChanges(
  request: (query: URLSearchParams) => Promise<GoogleChangePage>,
  savedToken: string | null,
  deadline: number,
): Promise<{ changed: boolean; token: string }> {
  let syncToken = savedToken;
  for (let attempt = 0; attempt < 2; attempt++) {
    let pageToken: string | undefined;
    let changed = !syncToken;
    try {
      do {
        if (Date.now() > deadline)
          throw new Error("Google synchronization timed out.");
        const query = new URLSearchParams({
          singleEvents: "false",
          showDeleted: "true",
          maxResults: "2500",
          fields: "items(id),nextPageToken,nextSyncToken",
        });
        if (syncToken) query.set("syncToken", syncToken);
        if (pageToken) query.set("pageToken", pageToken);
        const result = await request(query);
        changed ||= Boolean(result.items?.length);
        pageToken = result.nextPageToken;
        if (!pageToken) {
          if (!result.nextSyncToken)
            throw new Error("Google did not finish its change feed.");
          return { changed, token: result.nextSyncToken };
        }
      } while (pageToken);
    } catch (error) {
      if (
        attempt === 0 &&
        syncToken &&
        typeof error === "object" &&
        error !== null &&
        "status" in error &&
        error.status === 410
      ) {
        syncToken = null;
        continue;
      }
      throw error;
    }
  }
  throw new Error("Could not recover Google synchronization.");
}
