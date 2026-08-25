async function post(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const data = await res.json();
  if (!data.ok && data.error) {
    const err = new Error(data.error);
    Object.assign(err, data);
    throw err;
  }
  return data;
}

export async function fetchStarters() {
  const res = await fetch("/api/starters");
  return res.json();
}

export function openProject(root, entry) {
  return post("/api/open-project", { root, entry });
}

/** Open without throwing on empty folders (returns `{ ok: false, empty: true }`). */
export async function tryOpenProject(root, entry) {
  const res = await fetch("/api/open-project", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ root, entry }),
  });
  return res.json();
}

export function newProject(body) {
  return post("/api/new-project", body);
}

export function loadCatalogue(root, entry, files) {
  return post("/api/load", { root, entry, files });
}

export function diskSources(root, entry) {
  return post("/api/disk-sources", { root, entry });
}

export function writeFile(root, path, content, expectedBaseline) {
  return post("/api/write", { root, path, content, expectedBaseline });
}

export function renderFromBake(body) {
  return post("/api/render-from-bake", body);
}

export function exportArtifact(body) {
  return post("/api/export", body);
}
