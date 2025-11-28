// Node script to map athlete images to skiers and download them.
// Prefers athletes_images.csv (named pairs) but falls back to skiclassics_athelete_images.csv + skiers.csv order.
// Output:
//   src/game/data/generated/athleteImages.generated.json
//   public/athletes/<team-slug>/<athlete-slug>.jpg|png
//
// Run: npm run import:athlete-images

const fs = require("fs");
const path = require("path");
const https = require("https");
const { parse } = require("csv-parse/sync");

const root = path.resolve(__dirname, "..");
const dataDir = path.join(root, "src", "game", "data");
const outDir = path.join(dataDir, "generated");
const athleteOutDir = path.join(root, "public", "athletes");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function slugify(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function readCsv(file) {
  const raw = fs.readFileSync(file, "utf8");
  return parse(raw, { columns: true, skip_empty_lines: true });
}

function extractSkiers() {
  const file = path.join(dataDir, "skiers.csv");
  if (!fs.existsSync(file)) throw new Error("skiers.csv missing");
  const rows = readCsv(file);
  return rows.map((row, idx) => {
    const name = row["multiple_data_1"] || row["skierInfo"] || row["Athlete_Name_0"] || row["Athlete_Name"] || `unknown-${idx}`;
    const team = row["category-link-0"] || row["team"] || row["teamName"] || "";
    const id = row["athleteId"] || row["id"] || `ath-${slugify(name)}`;
    return { idx, name, id, slug: slugify(name), teamSlug: slugify(team) };
  });
}

function extractImageUrlsLegacy() {
  const file = path.join(dataDir, "skiclassics_athelete_images.csv");
  if (!fs.existsSync(file)) throw new Error("skiclassics_athelete_images.csv missing");
  const rows = readCsv(file);
  const urls = [];
  rows.forEach((row) => {
    Object.values(row).forEach((val) => {
      if (typeof val !== "string") return;
      const matches = val.match(/https?:\/\/[^\s"]+\.(?:png|jpe?g)/gi);
      if (matches) urls.push(...matches);
    });
  });
  return urls;
}

function extractImagePairsFromNamedFile() {
  const file = path.join(dataDir, "athletes_images.csv");
  if (!fs.existsSync(file)) return [];
  const rows = readCsv(file);
  const pairs = [];
  rows.forEach((row) => {
    const imagesRaw = row["images"] || "";
    const namesRaw = row["athletes"] || row["allAthletes"] || "";
    const teamSlug =
      slugify((row["multiple_data_0"] || row["team"] || row["data-page-selector"] || "").split("/").filter(Boolean).pop() || "");
    const images = String(imagesRaw)
      .split(/\s+/)
      .map((s) => s.trim())
      .filter((s) => /^https?:\/\//i.test(s));
    const names = String(namesRaw)
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const len = Math.min(images.length, names.length);
    for (let i = 0; i < len; i++) {
      const name = names[i];
      const url = images[i];
      const extMatch = url.match(/\.(png|jpe?g)/i);
      const ext = extMatch ? extMatch[0] : ".jpg";
      pairs.push({
        name,
        slug: slugify(name),
        team: teamSlug || "unknown",
        url,
        ext,
      });
    }
  });
  return pairs;
}

function download(url, dest) {
  return new Promise((resolve) => {
    ensureDir(path.dirname(dest));
    const file = fs.createWriteStream(dest);
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          file.close();
          fs.rm(dest, () => resolve(false));
          return resolve(false);
        }
        res.pipe(file);
        file.on("finish", () => file.close(() => resolve(true)));
      })
      .on("error", () => {
        file.close();
        fs.rm(dest, () => resolve(false));
      });
  });
}

async function run() {
  ensureDir(outDir);
  ensureDir(athleteOutDir);

  const pairs = [];

  const namedPairs = extractImagePairsFromNamedFile();
  if (namedPairs.length) {
    namedPairs.forEach((p) => {
      const teamDir = path.join(athleteOutDir, p.team || "unknown");
      const dest = path.join(teamDir, `${p.slug}${p.ext}`);
      pairs.push({
        id: p.slug,
        athleteId: p.slug,
        name: p.name,
        team: p.team,
        url: p.url,
        local: dest.replace(root, ""),
      });
    });
  } else {
    const skiers = extractSkiers();
    const images = extractImageUrlsLegacy();
    const slugMap = new Map(skiers.map((s) => [s.slug, s]));
    const used = new Set();
    images.forEach((url) => {
      const base = path.basename(url).split(".")[0];
      const imgSlug = slugify(base);
      let skier = slugMap.get(imgSlug);
      if (!skier) {
        const fallback = skiers.find((s) => !used.has(s.id));
        if (fallback) skier = fallback;
      }
      if (!skier) return;
      used.add(skier.id);
      const extMatch = url.match(/\.(png|jpe?g)/i);
      const ext = extMatch ? extMatch[0] : ".jpg";
      const teamDir = path.join(athleteOutDir, skier.teamSlug || "unknown");
      const dest = path.join(teamDir, `${skier.slug}${ext}`);
      pairs.push({
        id: skier.slug,
        athleteId: skier.id,
        name: skier.name,
        team: skier.teamSlug,
        url,
        local: dest.replace(root, ""),
      });
    });
  }

  // Download sequentially to avoid hammering.
  for (const p of pairs) {
    if (fs.existsSync(path.join(root, p.local))) continue;
    console.log(`Downloading ${p.id}`);
    await download(p.url, path.join(root, p.local));
  }

  fs.writeFileSync(path.join(outDir, "athleteImages.generated.json"), JSON.stringify(pairs, null, 2));
  console.log(`Mapped ${pairs.length} athlete images`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
