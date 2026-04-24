import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: "node_modules/three/examples/jsm/libs/draco/draco_decoder.js",
          dest: "draco",
          rename: { stripBase: true },
        },
        {
          src: "node_modules/three/examples/jsm/libs/draco/draco_decoder.wasm",
          dest: "draco",
          rename: { stripBase: true },
        },
        {
          src: "node_modules/three/examples/jsm/libs/draco/draco_wasm_wrapper.js",
          dest: "draco",
          rename: { stripBase: true },
        },
      ],
    }),
  ],
});
