import "./index.css";
import MaterialsCloudHeader from "mc-react-header";
import { McAppHeader } from "mc-react-library";
import { lazy, Suspense } from "react";

import { BASE, FIGURES, TITLE } from "./appConfig";
import Landing from "./Landing";

// The pages of the Bokeh app, chosen by the query string:
//   ?preset=<label>  scatter plot   (was /figure?preset=<label>)
//   ?name=<complex>  one complex    (was /detail?name=<complex>)
//   (none)           figure choice  (was /select-figure)
const FigurePage = lazy(() => import("./Figure"));
const DetailPage = lazy(() => import("./Detail"));

function route() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("name")) return { page: "detail", name: params.get("name") };
  if (params.has("preset")) return { page: "figure", preset: params.get("preset") };
  return { page: "landing" };
}

function App() {
  const r = route();
  const figure = FIGURES.find((f) => f.preset === r.preset);
  const crumb =
    r.page === "detail" ? r.name : r.page === "figure" ? (figure?.label ?? "Scatter plot") : null;

  return (
    <>
      <MaterialsCloudHeader
        activeSection="discover"
        breadcrumbsPath={[
          { name: "Discover", link: "https://www.materialscloud.org/discover" },
          { name: TITLE, link: crumb ? BASE : null },
          ...(crumb ? [{ name: crumb, link: null }] : []),
        ]}
      />

      <main className="min-h-screen bg-[aliceblue] pb-10">
        <div className="mx-auto max-w-7xl px-4">
          <div className="overflow-hidden bg-white shadow-sm p-4">
            <McAppHeader title={TITLE} />
            <div className="mx-auto max-w-6xl py-4">
              <Suspense fallback={<p className="text-slate-500">Loading…</p>}>
                {r.page === "landing" && <Landing />}
                {r.page === "figure" && <FigurePage preset={r.preset} />}
                {r.page === "detail" && <DetailPage name={r.name} />}
              </Suspense>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

export default App;
