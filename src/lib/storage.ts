import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

// Prototype storage: write to public/uploads so Next serves the file statically.
// Production target: swap this module for an S3-backed implementation.
async function save(subdir: string, id: string, file: File): Promise<string> {
  const dir = path.join(process.cwd(), "public", subdir);
  await mkdir(dir, { recursive: true });
  const rawExt = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const ext = rawExt || "jpg";
  const filename = `${id}.${ext}`;
  await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
  return `/${subdir}/${filename}`;
}

export function saveDeliveryPhoto(deliveryId: string, file: File): Promise<string> {
  return save("uploads/deliveries", deliveryId, file);
}

export function saveIncidentPhoto(incidentId: string, file: File): Promise<string> {
  return save("uploads/incidents", incidentId, file);
}
