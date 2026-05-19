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
    image: "",
    deliveryTime: "30–45 min",
    rating: 4.8,
    description: "Hortifruti, mercearia e bebidas com preço justo.",
  },
  {
    id: "farmacia-parceira",
    name: "Farmácia Parceira",
    category: "Farmácia",
    image: "",
    deliveryTime: "20–30 min",
    rating: 4.9,
    description: "Medicamentos, perfumaria e cuidados pessoais.",
  },
  {
    id: "eletronicos-jatai",
    name: "Eletrônicos Jataí",
    category: "Eletrônicos",
    image: "",
    deliveryTime: "30–50 min",
    rating: 4.7,
    description: "Acessórios, carregadores, cabos, fones e itens eletrônicos para o dia a dia.",
  },
];

export const PROMOTIONS: Promotion[] = [
  {
    id: "promo-1",
    title: "Hortifruti em oferta",
    storeName: "Supermercado Tosta 2",
    description: "Frutas e verduras com até 30% de desconto.",
    image: "",
    discount: "-30%",
  },
  {
    id: "promo-2",
    title: "Acessórios em destaque",
    storeName: "Eletrônicos Jataí",
    description: "Cabos, carregadores e fones com preços especiais para teste.",
    image: "",
    discount: "Teste",
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
  "Aguardando complemento do cliente",
  "A caminho do cliente",
  "Entregue",
  "Cancelado",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type ChatMessage = {
  id: string;
  from: "client" | "driver";
  text: string;
  at: number;
};

export type OrderItem = {
  productId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  custom?: boolean;
};

export type Order = {
  id: string;
  clientId: string;
  storeId: string;
  storeName: string;
  items: string;
  orderItems: OrderItem[];
  notes: string;
  subtotal: number;
  customSubtotal: number;
  estimatedValue: number;
  safetyMargin: number;
  authorizedPurchaseLimit: number;
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
