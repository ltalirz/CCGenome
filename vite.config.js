import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { parse } from "yaml";

// matsci-parse (via mc-react-library) imports moyo-wasm for symmetry, and Vite
// emits moyo's .wasm when it loads the module, even though tree-shaking drops
// all of moyo's code. Drop .wasm files that no chunk refers to.
function dropUnreferencedWasm() {
  return {
    name: "drop-unreferenced-wasm",
    apply: "build",
    generateBundle(_, bundle) {
      const code = Object.values(bundle)
        .filter((file) => file.type === "chunk")
        .map((chunk) => chunk.code)
        .join("\n");
      for (const [name, file] of Object.entries(bundle)) {
        if (file.type === "asset" && name.endsWith(".wasm") && !code.includes(name.split("/").pop())) {
          delete bundle[name];
        }
      }
    },
  };
}

// The plot configuration stays in YAML (src/config/*.yml, as in the Bokeh
// app); importing a .yml file gives its content, converted at build time.
function yamlAsJson() {
  return {
    name: "yaml-as-json",
    transform(code, id) {
      if (!id.split("?")[0].endsWith(".yml")) return null;
      return { code: `export default ${JSON.stringify(parse(code))};`, map: null };
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), dropUnreferencedWasm(), yamlAsJson()],
  optimizeDeps: {
    include: ["mc-react-header"],
    // Required to run wasm modules in dev mode for vite.
    exclude: ["@spglib/moyo-wasm"],
  },
});
