import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { saveIncidentPhoto } from "@/lib/storage";
import { dateKey } from "@/lib/week";

export const runtime = "nodejs";

const TYPES = ["DAMAGE", "LOSS"];

// GET /api/incidents?status=  — bakery/admin review list
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (session.role !== "ADMIN" && session.role !== "BAKERY") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const status = new URL(req.url).searchParams.get("status");
  const where =
    status && ["REPORTED", "CONFIRMED", "REJECTED"].includes(status) ? { status } : {};

  const incidents = await prisma.incident.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      delivery: { include: { cafe: { select: { name: true } } } },
      product: { select: { name: true, unit: true } },
      reportedBy: { select: { name: true } },
    },
  });

  return NextResponse.json({
    incidents: incidents.map((i) => ({
      id: i.id,
      deliveryDate: dateKey(i.delivery.date),
      cafeName: i.delivery.cafe.name,
      productName: i.product.name,
      unit: i.product.unit,
      qty: i.qty,
      type: i.type,
      reporterRole: i.reporterRole,
      reporterName: i.reportedBy.name,
      note: i.note,
      photoUrl: i.photoUrl,
      status: i.status,
      createdAt: i.createdAt,
    })),
  });
}

// POST /api/incidents — report (courier or café), multipart with optional photo
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (session.role !== "COURIER" && session.role !== "CAFE") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const deliveryId = form.get("deliveryId");
  const productId = form.get("productId");
  const type = form.get("type");
  const qtyRaw = form.get("qty");
  const note = typeof form.get("note") === "string" ? (form.get("note") as string).trim() || null : null;
  const photo = form.get("photo");

  if (typeof deliveryId !== "string" || typeof productId !== "string" || typeof type !== "string" || !TYPES.includes(type)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const qty = parseInt(typeof qtyRaw === "string" ? qtyRaw : "", 10);
  if (!Number.isInteger(qty) || qty <= 0) {
    return NextResponse.json({ error: "bad_qty" }, { status: 400 });
  }

  const delivery = await prisma.delivery.findUnique({ where: { id: deliveryId }, include: { items: true } });
  if (!delivery) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (session.role === "COURIER" && delivery.courierId !== session.userId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (session.role === "CAFE" && delivery.cafeId !== session.cafeId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const item = delivery.items.find((it) => it.productId === productId);
  if (!item) return NextResponse.json({ error: "product_not_in_delivery" }, { status: 400 });
  if (qty > item.qty) return NextResponse.json({ error: "qty_too_high" }, { status: 400 });

  let incident = await prisma.incident.create({
    data: {
      deliveryId,
      productId,
      qty,
      type,
      reporterRole: session.role,
      reportedById: session.userId,
      note,
      status: "REPORTED",
    },
  });

  if (photo instanceof File && photo.size > 0 && photo.size <= 10 * 1024 * 1024) {
    const photoUrl = await saveIncidentPhoto(incident.id, photo);
    incident = await prisma.incident.update({ where: { id: incident.id }, data: { photoUrl } });
  }

  return NextResponse.json({ ok: true, incident: { id: incident.id, status: incident.status, photoUrl: incident.photoUrl } }, { status: 201 });
}
