export type SeedBrandCategory = "beauty" | "fashion";

export type SeedSaleStatus = "active" | "upcoming" | "ended";

export interface SeedBrand {
  id: string;
  slug: string;
  name: string;
  category: SeedBrandCategory;
}

export interface SeedSaleEvent {
  id: string;
  brandId: string;
  title: string;
  subtitle: string;
  startAt: string;
  endAt: string;
  status: SeedSaleStatus;
  discountLabel: string;
}
