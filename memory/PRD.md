# Chekou Ganhou — PRD

## Visão Geral
Plataforma mobile de compra assistida e entrega sob demanda em Jataí, GO. Permite que clientes peçam itens de mercados, farmácias e lojas locais via Motoristas Parceiros, com pagamento (simulado), acompanhamento e confirmação de entrega por código.

## Stack
- **App:** React Native (Expo SDK 54) + expo-router
- **Storage:** AsyncStorage (preparado para Supabase)
- **Pagamento:** simulado (paymentService pronto para integrar Mercado Pago via backend)
- **Tema:** verde + branco (#059669)

## Perfis de Usuário
| Role | driverStatus | Tela após login |
|---|---|---|
| client | none | `/client/home` |
| client | pending | `/driver/pending` |
| client | blocked | `/driver/blocked` |
| driver | approved | `/driver/home` |
| driver | blocked | `/driver/blocked` |
| admin | – | `/admin` |

## Fluxos Principais

### Cliente
1. Login → Home → escolhe estabelecimento → cria pedido (lista livre + observações + valor estimado)
2. Revisão com breakdown (valor + margem 10% + entrega R$8 + taxa plataforma 7% + cupons)
3. Pagamento simulado via `paymentService.createPaymentIntent` + `markPaymentAsApproved`
4. Acompanhamento com tracker visual + código de 4 dígitos destacado
5. Chat com entregador, histórico de pedidos, promoções e cupons
6. CTA "Quero ser parceiro" para virar Motorista Parceiro

### Entregador
1. Login (se aprovado) → Home com saldo, nível e limite operacional
2. Vê pedidos disponíveis → aceita (bloqueia se valor > limite do nível)
3. Atualiza status, envia foto da nota e mercadorias (simulado)
4. Insere código de 4 dígitos do cliente → entrega concluída
5. Saldo e histórico separa: valor compra (não sacável), taxa entrega (sua), taxa plataforma, sobra devolvida

### Cadastro de Parceiro
Formulário com nome, CPF, telefone, e-mail, veículo, placa/CNH opcionais, região, chave Pix, aceite de termos → status `pending` → tela "Cadastro em análise" → admin aprova/reprova/bloqueia.

### Admin
- Tabs: Resumo, Pedidos, Motoristas, Usuários, Lojas, Produtos, Cupons, Disputas
- Aprovar/reprovar/bloquear motorista; mudar nível (1-4)
- CRUD de estabelecimentos (nome, tipo, endereço, taxa base, ativo/inativo)
- CRUD de produtos (categoria, loja, preço, promo, ativo)

## Níveis de Motorista
| Nível | Nome | Limite operacional |
|---|---|---|
| 1 | Novo parceiro | R$ 50 |
| 2 | Parceiro confiável | R$ 150 |
| 3 | Parceiro premium | R$ 300 |
| 4 | Parceiro elite | R$ 500 |

## Sistema Financeiro (separação visual e operacional)
- **Valor da compra:** saldo operacional do entregador — **não sacável**
- **Taxa de entrega:** receita do entregador — liberada após confirmação por código
- **Taxa da plataforma:** 7% — Chekou Ganhou
- **Sobra da compra:** devolvida ao cliente (diferença entre estimado+margem e valor real)

## Camada de Services (`/app/frontend/src/services/`)
- `authService` — login/signup/session/CRUD usuários
- `driverService` — application, níveis, status, guard `canAcceptOrder`
- `catalogService` — CRUD estabelecimentos e produtos
- `paymentService` — stubs Mercado Pago (createPaymentIntent, markAsApproved, refund, releaseDriverPayment, calculateSplit)
- `orderService` — facade sobre orderStore
- `adminService` — queries agregadas

Todos backed por AsyncStorage agora. Estrutura preparada para troca por chamadas HTTP a backend (Supabase + Edge Functions) sem mudar a UI.

## Telas Implementadas (29 rotas)
**Auth:** login, signup
**Cliente:** home, store/[id], checkout, tracking/[orderId], chat/[orderId], history, promotions, coupons
**Entregador:** home, order/[id], earnings, partner-signup, pending, blocked
**Admin:** index (tabs), establishments, products, driver/[id]
**Outros:** index (auth gate / splash)

## Conformidade
- Farmácia: aviso de não-compra de medicamentos controlados / sob receita
- Estabelecimentos: aviso de independência da plataforma e ausência de parceria oficial em listas "mais pedidos"

## Próximos Passos (futuro)
1. Supabase Auth + Postgres tables (users, driver_applications, orders, stores, products)
2. Mercado Pago real via backend/Edge Functions (webhooks, split, refund)
3. GPS/mapa (expo-location + react-native-maps)
4. Chat realtime (Supabase Realtime)
5. Push notifications (expo-notifications)
