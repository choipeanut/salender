import type { SeedBrand, SeedSaleEvent } from "./types";

export const seedBrands: SeedBrand[] = [
  {
    id: "00000000-0000-0000-0000-000000000101",
    slug: "oliveyoung",
    name: "올리브영",
    category: "beauty"
  },
  {
    id: "00000000-0000-0000-0000-000000000102",
    slug: "musinsa",
    name: "무신사",
    category: "fashion"
  },
  {
    id: "00000000-0000-0000-0000-000000000103",
    slug: "zara",
    name: "자라",
    category: "fashion"
  }
];

export const seedSaleEvents: SeedSaleEvent[] = [
  {
    id: "00000000-0000-0000-0000-000000000301",
    brandId: "00000000-0000-0000-0000-000000000101",
    title: "올영세일",
    subtitle: "올리브영 인기 스킨케어/메이크업 최대 50% 할인",
    startAt: "2026-04-05T00:00:00+09:00",
    endAt: "2026-04-12T23:59:00+09:00",
    status: "active",
    discountLabel: "최대 50% 할인"
  },
  {
    id: "00000000-0000-0000-0000-000000000302",
    brandId: "00000000-0000-0000-0000-000000000102",
    title: "블랙프라이데이",
    subtitle: "무신사 FW 인기 상품 대규모 특가",
    startAt: "2026-04-15T10:00:00+09:00",
    endAt: "2026-04-20T23:00:00+09:00",
    status: "upcoming",
    discountLabel: "최대 70% 특가"
  },
  {
    id: "00000000-0000-0000-0000-000000000303",
    brandId: "00000000-0000-0000-0000-000000000103",
    title: "특가 세일",
    subtitle: "자라 시즌오프 선별 상품 특가",
    startAt: "2026-04-08T00:00:00+09:00",
    endAt: "2026-04-14T23:59:00+09:00",
    status: "upcoming",
    discountLabel: "시즌 특가"
  }
];
