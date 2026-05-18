/**
 * ============================================================
 *  TENANT CONFIGURATION — Personalize aqui para cada cliente
 * ============================================================
 *
 *  Para configurar um novo cliente, basta editar os valores
 *  abaixo. Nenhum outro arquivo precisa ser alterado.
 */

export const TENANT = {
  // ─── Identidade da Loja ─────────────────────────────────
  /** Nome principal exibido no header e nos templates de impressão */
  storeName: 'Minha Loja',

  /** Subtítulo / segmento da loja (ex: "Artigos Religiosos", "Moda Feminina") */
  storeSubtitle: 'Catálogo de Produtos',

  /** Slogan curto exibido no modal de produto */
  storeSlogan: 'Qualidade & Estilo',

  /** Rodapé da página de login do admin */
  adminFooter: 'Minha Loja • Gestão',

  // ─── SEO / Metadados ────────────────────────────────────
  /** Título da aba do navegador */
  metaTitle: 'Minha Loja — Catálogo Online',

  /** Descrição para motores de busca */
  metaDescription: 'Navegue pelo nosso catálogo e faça seu pedido de forma rápida e fácil.',

  // ─── Cores (valores HSL sem a função hsl()) ──────────────
  /**
   * Cor primária da interface — usada em botões, destaques e links.
   * Formato: "H S% L%"  (ex: "220 90% 56%" = azul vibrante)
   *
   * Sugestões:
   *   Azul moderno   → "220 90% 56%"
   *   Verde esmeralda→ "160 84% 39%"
   *   Roxo           → "262 80% 58%"
   *   Dourado        → "43 89% 38%"
   *   Coral          → "16 90% 55%"
   */
  primaryHsl: '220 90% 56%',

  /**
   * Cor de fundo da página.
   * Formato: "H S% L%"
   */
  backgroundHsl: '220 20% 98%',

  /**
   * Cor do gradiente radial decorativo (canto superior esquerdo).
   * Formato: "H S% L%"
   */
  gradientAccentHsl: '220 90% 56%',

  // ─── Textos do Carrinho / Checkout ──────────────────────
  /** Mensagem de abertura no WhatsApp ao enviar pedido */
  whatsappGreeting: 'Olá! Gostaria de fazer um pedido 🛒',

  // ─── Textos do Modal de Produto ─────────────────────────
  /** Texto exibido quando o produto não tem descrição cadastrada */
  productDescriptionFallback:
    'Um produto selecionado com cuidado para você.',

  /** Placeholder do campo de personalização no modal */
  customizationPlaceholder: 'Ex: Nome, frase, cor desejada...',

  // ─── Catálogo / Categorias ───────────────────────────────
  /**
   * Ordem manual das categorias na página inicial (view "Tudo").
   * Use os nomes exatos das categorias em letras minúsculas.
   * Categorias não listadas aqui aparecem depois, em ordem alfabética.
   * Deixe o array vazio [] para usar apenas ordem alfabética.
   */
  categoryOrder: [] as string[],

  // ─── Impressão — Cupom Térmico 80mm ─────────────────────
  /** Mensagem de agradecimento no rodapé do cupom térmico */
  orderThanksMessage: 'Obrigado pela preferência! 😊',

  // ─── Impressão — Relatório de Vendas ────────────────────
  /** Nome da marca exibido no cabeçalho do relatório impresso */
  reportBrand: 'Order System',

  // ─── E-mail ─────────────────────────────────────────────
  /** Prefixo do assunto dos e-mails enviados ao cliente */
  emailSubjectPrefix: 'Confirmação de Pedido',

  // ─── Segurança ──────────────────────────────────────────
  /**
   * Fallback do segredo JWT para o painel admin.
   * ⚠️  Em produção, defina a variável de ambiente JWT_SECRET.
   *     Este valor é usado apenas em desenvolvimento local.
   */
  jwtSecretFallback: 'order-system-default-secret-key-change-me',
} as const;
