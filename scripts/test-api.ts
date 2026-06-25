import { getRepository } from "../src/lib/storage";
import { projectInputSchema, defaultProjectInput } from "../src/lib/defaults";
import { analyzeProject } from "../src/lib/calculations";
import { promises as fs } from "fs";
import path from "path";

async function main() {
  const dataFile = path.join(process.cwd(), "data", "projects.json");
  try {
    await fs.unlink(dataFile);
  } catch {
    /* no file yet */
  }

  const repo = getRepository();

  console.log("1. list empty:", JSON.stringify(await repo.list()));

  const bad = projectInputSchema.safeParse({ name: "" });
  console.log("2. bad input rejected:", !bad.success, "| first issue:", bad.success ? "n/a" : bad.error.issues[0].message);

  const good = projectInputSchema.safeParse(defaultProjectInput());
  console.log("3. default input valid:", good.success);
  if (!good.success) {
    console.log("   ERRORS", good.error.issues);
    process.exit(1);
  }

  const created = await repo.create(good.data);
  console.log("4. created id present:", Boolean(created.id), "| name:", created.name);

  const onDisk = JSON.parse(await fs.readFile(dataFile, "utf8"));
  console.log("5. persisted to disk:", onDisk.length === 1, "| disk name:", onDisk[0].name);

  const fetched = await repo.get(created.id);
  console.log("6. fetched back:", fetched?.id === created.id);

  const updated = await repo.update(created.id, { ...good.data, name: "Renamed Project", holdYears: 7 });
  console.log("7. updated name:", updated?.name, "| holdYears:", updated?.holdYears);

  const analysis = analyzeProject(fetched!);
  console.log("8. analysis years:", analysis.proForma.length, "| IRR:", analysis.returns.irr?.toFixed(2) + "%", "| profit:", Math.round(analysis.returns.totalProfit));

  const list = await repo.list();
  console.log("9. list has", list.length, "| netProfit:", Math.round(list[0].netProfit));

  const removed = await repo.remove(created.id);
  const after = await repo.list();
  console.log("10. deleted:", removed, "| list empty:", after.length === 0);

  const longHold = analyzeProject({ ...fetched!, holdYears: 10 });
  console.log("11. extend to 10yr -> proForma rows:", longHold.proForma.length, "| amort months:", longHold.amortization.length);

  console.log("\nAPI/STORAGE LAYER OK");
}

main().catch((e) => {
  console.error("FAILED", e);
  process.exit(1);
});
