import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

// Photo storage with graceful fallbacks:
//   1) Vercel Blob   — used in production when BLOB_READ_WRITE_TOKEN is set;
//   2) local disk    — public/uploads for local dev;
//   3) no-op         — if neither works (e.g. read-only serverless FS without Blob),
//                      returns "" so the upload action still succeeds (just no image).
async function save(subdir: string, id: string, file: File): Promise<string> {
  const rawExt = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const ext = rawExt || "jpg";
  const filename = `${id}.${ext}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { put } = await import("@vercel/blob");
      const blob = await put(`${subdir}/${filename}`, file, {
        access: "public",
        token: process.env.BLOB_READ_WRITE_TOKEN,
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      return blob.url;
    } catch {
      // fall through to disk
    }
  }

  try {
    const dir = path.join(process.cwd(), "public", subdir);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
    return `/${subdir}/${filename}`;
  } catch {
    return "";
  }
}

export function saveDeliveryPhoto(deliveryId: string, file: File): Promise<string> {
  return save("uploads/deliveries", deliveryId, file);
}

export function saveIncidentPhoto(incidentId: string, file: File): Promise<string> {
  return save("uploads/incidents", incidentId, file);
}
