// 站点质检：node tools/check.mjs [页面路径…] [--shots 目录] [--quick]
// 实现在 ~/tutorials-deploy/scripts/check.mjs（所有教程站共用），这里只是转调。
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
// 项目打包下载的 zip 是部署时才生成的，本地必然 404
process.env.CHECK_IGNORE_HTTP = "aposd-project\\.zip";
process.env.SITE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
await import(pathToFileURL(join(homedir(), "tutorials-deploy/scripts/check.mjs")).href);
