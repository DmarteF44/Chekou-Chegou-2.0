export type Establishment = {
  id: string;
  name: string;
  category: string;
  image: string;
  deliveryTime: string;
  rating: number;
  description: string;
};

export type Promotion = {
  id: string;
  title: string;
  storeName: string;
  description: string;
  image: string;
  discount: string;
};

export type Coupon = {
  code: string;
  description: string;
  discount: number; // R$
  type: "delivery" | "order";
};

export const ESTABLISHMENTS: Establishment[] = [
  {
    id: "tosta-2",
    name: "Supermercado Tosta 2",
    category: "Mercado",
    image:
      "https://images.unsplash.com/photo-1578916171728-46686eac8d58?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTJ8MHwxfHNlYXJjaHwyfHxzdXBlcm1hcmtldCUyMGFpc2xlfGVufDB8fHx8MTc3OTExMDUzMHww&ixlib=rb-4.1.0&q=85",
    deliveryTime: "30–45 min",
    rating: 4.8,
    description: "Hortifruti, mercearia e bebidas com preço justo.",
  },
  {
    id: "mercadao",
    name: "Mercadão da Economia",
    category: "Mercado",
    image:
      "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTJ8MHwxfHNlYXJjaHwxfHxzdXBlcm1hcmtldCUyMGFpc2xlfGVufDB8fHx8MTc3OTExMDUzMHww&ixlib=rb-4.1.0&q=85",
    deliveryTime: "35–50 min",
    rating: 4.6,
    description: "Tudo para a sua casa, sempre em promoção.",
  },
  {
    id: "farmacia-parceira",
    name: "Farmácia Parceira",
    category: "Farmácia",
    image:
      "https://images.unsplash.com/photo-1576602976047-174e57a47881?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1OTV8MHwxfHNlYXJjaHwxfHxwaGFybWFjeSUyMG1vZGVybnxlbnwwfHx8fDE3NzkxMTA1MzF8MA&ixlib=rb-4.1.0&q=85",
    deliveryTime: "20–30 min",
    rating: 4.9,
    description: "Medicamentos, perfumaria e cuidados pessoais.",
  },
];

export const PROMOTIONS: Promotion[] = [
  {
    id: "promo-1",
    title: "Hortifruti em oferta",
    storeName: "Supermercado Tosta 2",
    description: "Frutas e verduras com até 30% de desconto.",
    image:
      "https://images.unsplash.com/photo-1542838132-92c53300491e?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjh8MHwxfHNlYXJjaHwxfHxmcmVzaCUyMGZvb2QlMjBncm9jZXJpZXN8ZW58MHx8fHwxNzc5MTEwNTMxfDA&ixlib=rb-4.1.0&q=85",
    discount: "-30%",
  },
  {
    id: "promo-2",
    title: "Bebidas geladas",
    storeName: "Mercadão da Economia",
    description: "Compre 6, pague 5 em refrigerantes selecionados.",
    image:
      "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTJ8MHwxfHNlYXJjaHwxfHxzdXBlcm1hcmtldCUyMGFpc2xlfGVufDB8fHx8MTc3OTExMDUzMHww&ixlib=rb-4.1.0&q=85",
    discount: "6x5",
  },
];

export const COUPONS: Coupon[] = [
  { code: "PRIMEIRA10", description: "R$10 off no primeiro pedido", discount: 10, type: "order" },
  { code: "CHEKOU5", description: "R$5 off em qualquer pedido", discount: 5, type: "order" },
  { code: "ENTREGAOFF", description: "Entrega grátis", discount: 8, type: "delivery" },
];

export const ORDER_STATUSES = [
  "Aguardando entregador",
  "Entregador aceitou",
  "Indo ao estabelecimento",
  "Comprando produtos",
  "A caminho do cliente",
  "Entregue",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type ChatMessage = {
  id: string;
  from: "client" | "driver";
  text: string;
  at: number;
};

export type Order = {
  id: string;
  storeId: string;
  storeName: string;
  items: string;
  notes: string;
  estimatedValue: number;
  safetyMargin: number;
  deliveryFee: number;
  platformFee: number;
  total: number;
  couponCode?: string;
  discount: number;
  status: OrderStatus;
  createdAt: number;
  confirmationCode: string; // 4 digits
  actualValue?: number;
  invoicePhotoSent: boolean;
  goodsPhotoSent: boolean;
  driverId?: string;
  chat: ChatMessage[];
  paid: boolean;
};

export const DEFAULT_DRIVER_NAME = "João Entregador";
export const DEFAULT_CLIENT_NAME = "Maria Cliente";
