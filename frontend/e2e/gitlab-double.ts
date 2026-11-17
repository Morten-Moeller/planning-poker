const PROJECT_PATH = '/api/v4/projects/1234/issues';

function adminUrl(path: string): string {
  return `http://localhost:${process.env['GITLAB_DOUBLE_PORT'] ?? '8089'}/__admin${path}`;
}

async function addStub(stub: object): Promise<string> {
  const response = await fetch(adminUrl('/mappings'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(stub),
  });
  if (!response.ok) {
    throw new Error(
      `GitLab double answered ${response.status} to a new stub; inspect /__admin/mappings`,
    );
  }
  const created = (await response.json()) as { id: string };
  return created.id;
}

export function uniqueIssueIid(): number {
  return 100_000 + Math.floor(Math.random() * 900_000);
}

export async function stubIssueWithFailingFirstNote(iid: number, title: string): Promise<string[]> {
  const issuePath = `${PROJECT_PATH}/${iid}`;
  const scenarioName = `issue-${iid}-notes`;
  return Promise.all([
    addStub({
      request: { method: 'GET', urlPath: issuePath },
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        jsonBody: {
          iid,
          title,
          description: 'As a user I want to export the report as a file.',
          web_url: `https://gitlab.example/group/project/-/issues/${iid}`,
          labels: [],
        },
      },
    }),
    addStub({
      scenarioName,
      requiredScenarioState: 'Started',
      newScenarioState: 'first-note-failed',
      request: { method: 'POST', urlPath: `${issuePath}/notes` },
      response: {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
        jsonBody: { message: '500 Internal Server Error' },
      },
    }),
    addStub({
      scenarioName,
      requiredScenarioState: 'first-note-failed',
      request: { method: 'POST', urlPath: `${issuePath}/notes` },
      response: {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
        jsonBody: { id: 2, body: 'Planning Poker' },
      },
    }),
  ]);
}

export async function removeStubs(ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => fetch(adminUrl(`/mappings/${id}`), { method: 'DELETE' })));
}

export async function countNotes(iid: number): Promise<number> {
  const response = await fetch(adminUrl('/requests/count'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method: 'POST', urlPath: `${PROJECT_PATH}/${iid}/notes` }),
  });
  if (!response.ok) {
    throw new Error(`GitLab double answered ${response.status} to the request count`);
  }
  const result = (await response.json()) as { count: number };
  return result.count;
}
