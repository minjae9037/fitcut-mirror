import {
  getPilotSalonFallback,
  pilotSalons,
  type PilotSalon,
  type SalonBookingSlot,
  type SalonBookingSlotStatus,
  type SalonDesignerPortfolioItem,
} from "@/lib/mirilook-marketplace";
import { getSupabaseAdminClient } from "@/lib/server/supabase-admin";

type SalonRow = {
  address: string | null;
  description: string | null;
  hero_image_path: string | null;
  hours: string | null;
  id: string;
  latitude: number | null;
  longitude: number | null;
  name: string | null;
  phone: string | null;
  price_range: string | null;
  profile_status: string | null;
  rating: string | null;
  review_count: number | null;
  tags: string[] | null;
  visit_tip: string | null;
};

type DesignerRow = {
  bio: string | null;
  booking_status: string | null;
  booking_windows: unknown;
  id: string;
  name: string | null;
  portfolio_items: unknown;
  rating: string | null;
  review_count: number | null;
  salon_id: string;
  service_menu: string[] | null;
  specialties: string[] | null;
};

type ReviewHighlightRow = {
  body: string | null;
  created_at: string;
  rating: number | null;
  salon_id: string | null;
};

const visibleSalonStatuses = new Set(["active", "approved", "pilot"]);
const visibleDesignerStatuses = new Set(["active", "approved", "pilot"]);

export async function loadPilotSalons(): Promise<PilotSalon[]> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return pilotSalons;
  }

  const [salonResult, designerResult, reviewResult] = await Promise.all([
    supabase
      .from("salons")
      .select(
        "id, name, address, latitude, longitude, phone, hours, price_range, description, tags, rating, review_count, visit_tip, profile_status, hero_image_path",
      )
      .order("created_at", { ascending: true }),
    supabase
      .from("designers")
      .select(
        "id, salon_id, name, specialties, bio, rating, review_count, booking_status, service_menu, portfolio_items, booking_windows",
      )
      .order("created_at", { ascending: true }),
    supabase
      .from("reviews")
      .select("salon_id, body, rating, created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(80),
  ]);

  if (salonResult.error || designerResult.error) {
    console.error("marketplace load failed", {
      designers: designerResult.error,
      salons: salonResult.error,
    });

    return pilotSalons;
  }

  if (reviewResult.error) {
    console.error("marketplace review load failed", reviewResult.error);
  }

  const designersBySalon = new Map<string, DesignerRow[]>();

  ((designerResult.data ?? []) as DesignerRow[])
    .filter((designer) => isVisibleDesignerStatus(designer.booking_status))
    .forEach((designer) => {
      const current = designersBySalon.get(designer.salon_id) ?? [];

      current.push(designer);
      designersBySalon.set(designer.salon_id, current);
    });
  const reviewsBySalon = new Map<string, string[]>();

  ((reviewResult.data ?? []) as ReviewHighlightRow[])
    .filter((review) => review.salon_id && review.body)
    .forEach((review) => {
      const current = reviewsBySalon.get(review.salon_id ?? "") ?? [];

      if (current.length < 3 && review.body) {
        current.push(review.body.trim().slice(0, 120));
      }

      reviewsBySalon.set(review.salon_id ?? "", current);
    });

  const rawSalons = (salonResult.data ?? []) as SalonRow[];
  const salons = rawSalons
    .filter((salon) => isVisibleSalonStatus(salon.profile_status))
    .map((salon) => {
      const fallback = getPilotSalonFallback(salon.id);

      return {
        address: salon.address ?? fallback?.address ?? "",
        description: salon.description ?? fallback?.description ?? "",
        designers: (designersBySalon.get(salon.id) ?? []).map((designer) => {
          const fallbackDesigner = fallback?.designers.find(
            (item) => item.id === designer.id,
          );

          return {
            bio: designer.bio ?? fallbackDesigner?.bio ?? "",
            bookingSlots:
              normalizeBookingSlots(designer.booking_windows) ??
              fallbackDesigner?.bookingSlots ??
              [],
            id: designer.id,
            imageUrl: fallbackDesigner?.imageUrl ?? "",
            name: designer.name ?? designer.id,
            portfolio:
              normalizePortfolioItems(designer.portfolio_items) ??
              fallbackDesigner?.portfolio ??
              [],
            rating: designer.rating ?? fallbackDesigner?.rating ?? "0.0",
            reviewCount:
              designer.review_count ?? fallbackDesigner?.reviewCount ?? 0,
            reviews: fallbackDesigner?.reviews ?? [],
            serviceMenu:
              normalizeStringList(designer.service_menu) ??
              fallbackDesigner?.serviceMenu ??
              [],
            specialties: designer.specialties ?? fallbackDesigner?.specialties ?? [],
          };
        }),
        hours: salon.hours ?? fallback?.hours ?? "",
        id: salon.id,
        imageUrl: salon.hero_image_path ?? fallback?.imageUrl ?? "",
        latitude: salon.latitude ?? fallback?.latitude ?? 0,
        longitude: salon.longitude ?? fallback?.longitude ?? 0,
        name: salon.name ?? salon.id,
        phone: salon.phone ?? fallback?.phone ?? "",
        priceRange: salon.price_range ?? fallback?.priceRange ?? "",
        rating: salon.rating ?? fallback?.rating ?? "0.0",
        reviewCount: salon.review_count ?? fallback?.reviewCount ?? 0,
        reviewHighlights:
          reviewsBySalon.get(salon.id) ?? fallback?.reviewHighlights ?? [],
        tags: salon.tags ?? fallback?.tags ?? [],
        visitTip: salon.visit_tip ?? fallback?.visitTip ?? "",
      };
    });

  if (salons.length || rawSalons.length) {
    return salons;
  }

  return pilotSalons;
}

function isVisibleSalonStatus(status: string | null) {
  return visibleSalonStatuses.has(status ?? "pilot");
}

function isVisibleDesignerStatus(status: string | null) {
  return visibleDesignerStatuses.has(status ?? "pilot");
}

function normalizeStringList(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const items = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length ? items : undefined;
}

function normalizePortfolioItems(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const items = value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;
      const title = normalizeText(record.title);
      const imageUrl = normalizeText(record.imageUrl ?? record.image_url);
      const note = normalizeText(record.note);

      if (!title || !imageUrl || !note) {
        return null;
      }

      return {
        imageUrl,
        note,
        title,
      } satisfies SalonDesignerPortfolioItem;
    })
    .filter((item): item is SalonDesignerPortfolioItem => Boolean(item));

  return items.length ? items : undefined;
}

function normalizeBookingSlots(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const items = value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;
      const id = normalizeText(record.id);
      const dateLabel = normalizeText(record.dateLabel ?? record.date_label);
      const timeLabel = normalizeText(record.timeLabel ?? record.time_label);
      const capacityLabel = normalizeText(
        record.capacityLabel ?? record.capacity_label,
      );
      const status = normalizeSlotStatus(record.status);
      const serviceTypes = normalizeStringList(
        record.serviceTypes ?? record.service_types,
      );

      if (!id || !dateLabel || !timeLabel || !capacityLabel) {
        return null;
      }

      return {
        capacityLabel,
        dateLabel,
        id,
        serviceTypes: serviceTypes ?? [],
        status,
        timeLabel,
      } satisfies SalonBookingSlot;
    })
    .filter((item): item is SalonBookingSlot => Boolean(item));

  return items.length ? items : undefined;
}

function normalizeSlotStatus(value: unknown): SalonBookingSlotStatus {
  return value === "few-left" || value === "full" ? value : "available";
}

function normalizeText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
