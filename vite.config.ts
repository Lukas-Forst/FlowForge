import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "copy-draco-decoder",
      apply: "build",
      async generateBundle() {
        const srcDir = path.resolve(
          "node_modules/three/examples/jsm/libs/draco"
        );
        const destDir = path.resolve("dist/draco");

        // Create destination directory
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }

        // Copy files from source to destination
        const files = fs.readdirSync(srcDir);
        for (const file of files) {
          const srcFile = path.join(srcDir, file);
          const stat = fs.statSync(srcFile);
          if (stat.isFile()) {
            const content = fs.readFileSync(srcFile);
            fs.writeFileSync(path.join(destDir, file), content);
          }
        }
      },
    },
  ],
});
