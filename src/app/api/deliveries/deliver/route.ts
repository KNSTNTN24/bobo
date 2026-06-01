import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { saveDeliveryPhoto } from "@/lib/storage";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024;

// Courier confirms delivery of one café with a photo (multipart/form-data).
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (session.role !== "COURIER") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const deliveryId = form.get("deliveryId");
  const photo = form.get("photo");

  if (typeof deliveryId !== "string" || !(photo instanceof File)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (photo.size === 0 || photo.size > MAX_BYTES) {
    return NextResponse.json({ error: "bad_photo" }, { status: 400 });
  }

  const delivery = await prisma.delivery.findUnique({ where: { id: deliveryId } });
  if (!delivery || delivery.courierId !== session.userId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (delivery.status !== "PICKED_UP") {
    return NextResponse.json({ error: "not_picked_up" }, { status: 409 });
  }

  const photoUrl = await saveDeliveryPhoto(delivery.id, photo);
  const updated = await prisma.delivery.update({
    where: { id: delivery.id },
    data: { status: "DELIVERED", deliveredAt: new Date(), photoUrl },
  });

  return NextResponse.json({ ok: true, delivery: { id: updated.id, status: updated.status, photoUrl: updated.photoUrl } });
}
