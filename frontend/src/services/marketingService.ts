import { COUPONS, Coupon, PROMOTIONS, Promotion } from "@/src/data/mock";
import { storage } from "@/src/utils/storage";

const COUPONS_KEY = "chekou_coupons_v1";
const PROMOTIONS_KEY = "chekou_promotions_v1";
const SEED_KEY = "chekou_marketing_seed_v1";
const SEED_VERSION = "1";

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

async function ensureSeed() {
  const seeded = await storage.getItem<string>(SEED_KEY, "");
  if (seeded === SEED_VERSION) return;

  const rawCoupons = (await storage.getItem<string>(COUPONS_KEY, "")) || "";
  const rawPromotions = (await storage.getItem<string>(PROMOTIONS_KEY, "")) || "";
  const coupons = rawCoupons ? (JSON.parse(rawCoupons) as Coupon[]) : [];
  const promotions = rawPromotions ? (JSON.parse(rawPromotions) as Promotion[]) : [];

  const couponsByCode = new Map(coupons.map((coupon) => [coupon.code.toUpperCase(), coupon]));
  const promotionsById = new Map(promotions.map((promotion) => [promotion.id, promotion]));

  COUPONS.forEach((coupon) => {
    const code = coupon.code.toUpperCase();
    couponsByCode.set(code, {
      ...couponsByCode.get(code),
      ...coupon,
      code,
      active: coupon.active ?? true,
    });
  });

  PROMOTIONS.forEach((promotion) => {
    promotionsById.set(promotion.id, {
      ...promotionsById.get(promotion.id),
      ...promotion,
      image: promotion.image?.trim() ?? "",
      active: promotion.active ?? true,
    });
  });

  await storage.setItem(COUPONS_KEY, JSON.stringify(Array.from(couponsByCode.values())));
  await storage.setItem(PROMOTIONS_KEY, JSON.stringify(Array.from(promotionsById.values())));
  await storage.setItem(SEED_KEY, SEED_VERSION);
}

async function readCoupons() {
  await ensureSeed();
  const raw = (await storage.getItem<string>(COUPONS_KEY, "")) || "";
  return raw ? (JSON.parse(raw) as Coupon[]) : [];
}

async function writeCoupons(coupons: Coupon[]) {
  await storage.setItem(COUPONS_KEY, JSON.stringify(coupons));
  notify();
}

async function readPromotions() {
  await ensureSeed();
  const raw = (await storage.getItem<string>(PROMOTIONS_KEY, "")) || "";
  return raw ? (JSON.parse(raw) as Promotion[]) : [];
}

async function writePromotions(promotions: Promotion[]) {
  await storage.setItem(PROMOTIONS_KEY, JSON.stringify(promotions));
  notify();
}

export const marketingService = {
  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  },

  async listCoupons(opts?: { activeOnly?: boolean }) {
    const coupons = await readCoupons();
    return opts?.activeOnly ? coupons.filter((coupon) => coupon.active !== false) : coupons;
  },

  async getCoupon(code: string) {
    const normalized = code.trim().toUpperCase();
    const coupons = await readCoupons();
    return coupons.find((coupon) => coupon.code.toUpperCase() === normalized && coupon.active !== false);
  },

  async upsertCoupon(coupon: Coupon) {
    const coupons = await readCoupons();
    const normalized = coupon.code.trim().toUpperCase();
    const next = {
      ...coupon,
      code: normalized,
      description: coupon.description.trim(),
      discount: Math.max(0, coupon.discount),
      active: coupon.active ?? true,
    };
    const idx = coupons.findIndex((item) => item.code.toUpperCase() === normalized);
    if (idx >= 0) coupons[idx] = next; else coupons.push(next);
    await writeCoupons(coupons);
  },

  async deleteCoupon(code: string) {
    const normalized = code.trim().toUpperCase();
    await writeCoupons((await readCoupons()).filter((coupon) => coupon.code.toUpperCase() !== normalized));
  },

  async listPromotions(opts?: { activeOnly?: boolean }) {
    const promotions = await readPromotions();
    return opts?.activeOnly ? promotions.filter((promotion) => promotion.active !== false) : promotions;
  },

  async upsertPromotion(promotion: Promotion) {
    const promotions = await readPromotions();
    const next = {
      ...promotion,
      title: promotion.title.trim(),
      storeName: promotion.storeName.trim(),
      description: promotion.description.trim(),
      image: promotion.image.trim(),
      discount: promotion.discount.trim(),
      active: promotion.active ?? true,
    };
    const idx = promotions.findIndex((item) => item.id === promotion.id);
    if (idx >= 0) promotions[idx] = next; else promotions.push(next);
    await writePromotions(promotions);
  },

  async deletePromotion(id: string) {
    await writePromotions((await readPromotions()).filter((promotion) => promotion.id !== id));
  },
};

export type { Coupon, Promotion };
