const knownPaths = new Set([
  "/", "/login", "/register", "/select-role", "/dashboard",
  "/dashboard/food-batches", "/dashboard/donors", "/dashboard/receivers",
  "/dashboard/analytics", "/legal-vault", "/simulation", "/profile",
  "/missions", "/batches/new"
]);

export function getRoute() {
  const url = new URL(window.location.href);
  const pathname = url.pathname.endsWith("/") && url.pathname !== "/"
    ? url.pathname.slice(0, -1)
    : url.pathname;
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "batches" && parts[1]) {
    return { name: parts[2] === "edit" ? "batch-edit" : "batch-detail", id: decodeURIComponent(parts[1]), query: url.searchParams, path: pathname };
  }
  return {
    name: knownPaths.has(pathname) ? pathname : "/",
    id: "",
    query: url.searchParams,
    path: pathname
  };
}

export function navigate(path, replace) {
  const target = new URL(String(path || "/"), window.location.origin);
  const destination = target.pathname + target.search + target.hash;
  if (replace) history.replaceState({}, "", destination);
  else history.pushState({}, "", destination);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function routeHref(path) {
  return String(path || "/").replaceAll("&", "&amp;");
}