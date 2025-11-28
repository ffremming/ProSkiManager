// Node script to import skiers.csv and teams.csv into normalized JSON and download team logos.
// Run: npm run import:data
// Outputs:
//   src/game/data/generated/skiers.generated.json
//   src/game/data/generated/teams.generated.json
//   public/team-logos/<slug>.png (if download succeeds)

const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");
const https = require("https");

const root = path.resolve(__dirname, "..");
const dataDir = path.join(root, "src", "game", "data");
const outDir = path.join(dataDir, "generated");
const logosDir = path.join(root, "public", "team-logos");

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
  if (!fs.existsSync(file)) return [];
  const rows = readCsv(file);
  return rows.map((row, idx) => {
    const name = row["multiple_data_1"] || row["skierInfo"] || `unknown-${idx}`;
    const born = row["Born_0"] || "";
    const proTour = row["Pro_Tour_Events_0"] || "";
    const challengers = row["Challengers_0"] || "";
    const rankingInfo = row["multiple_data_0"] || "";
    const id = `ath-${slugify(name)}`;
    return {
      id,
      name,
      born,
      proTourEvents: proTour,
      challengers,
      ranking: rankingInfo,
      raw: row,
    };
  });
}

function extractTeams() {
  const file = path.join(dataDir, "teams.csv");
  if (!fs.existsSync(file)) return [];
  const rows = readCsv(file);
  return rows.map((row) => {
    const name = row["data"] || row["team"] || row["Team"] || row["name"];
    const image = row["image"] || row["logo"] || "";
    const id = `team-${slugify(name)}`;
    return { id, name, image };
  });
}

function download(url, dest) {
  return new Promise((resolve) => {
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
  ensureDir(logosDir);

  const skiers = extractSkiers();
  fs.writeFileSync(path.join(outDir, "skiers.generated.json"), JSON.stringify(skiers, null, 2));
  console.log(`Wrote ${skiers.length} skiers`);

  const teams = extractTeams();
  fs.writeFileSync(path.join(outDir, "teams.generated.json"), JSON.stringify(teams, null, 2));
  console.log(`Wrote ${teams.length} teams`);

  for (const team of teams) {
    if (!team.image) continue;
    const slug = slugify(team.name);
    const dest = path.join(logosDir, `${slug}.png`);
    if (fs.existsSync(dest)) continue;
    console.log(`Downloading logo for ${team.name}`);
    await download(team.image, dest);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
