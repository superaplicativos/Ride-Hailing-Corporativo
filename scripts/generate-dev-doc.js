const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Header, Footer,
  AlignmentType, HeadingLevel, PageNumber, PageBreak,
  TableOfContents, SectionType, Table, TableRow, TableCell,
  WidthType, BorderStyle, ShadingType
} = require("docx");

// === Palette: Cool + Heavy + Active (Tech Report) ===
const P = {
  bg: "#0F1923",
  titleColor: "#E8ECF0",
  subtitleColor: "#8BA3B8",
  metaColor: "#7A95AD",
  accent: "#4A90D9",
  footerColor: "#5A7A94",
  primary: "#0A1628",
  body: "#1C2A3D",
  secondary: "#5B6B7D",
  surface: "#F4F8FC"
};
const c = (hex) => hex.replace("#", "");

const allNoBorders = {
  top: { style: BorderStyle.NONE, size: 0 },
  bottom: { style: BorderStyle.NONE, size: 0 },
  left: { style: BorderStyle.NONE, size: 0 },
  right: { style: BorderStyle.NONE, size: 0 },
};
const noBorders = {
  top: { style: BorderStyle.NONE, size: 0 },
  bottom: { style: BorderStyle.NONE, size: 0 },
  left: { style: BorderStyle.NONE, size: 0 },
  right: { style: BorderStyle.NONE, size: 0 },
};

// === Helper functions ===
function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 480, after: 200 },
    children: [new TextRun({ text, bold: true, size: 32, color: c(P.primary), font: { ascii: "Times New Roman", eastAsia: "SimHei" } })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 360, after: 160 },
    children: [new TextRun({ text, bold: true, size: 28, color: c(P.primary), font: { ascii: "Times New Roman", eastAsia: "SimHei" } })],
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true, size: 24, color: c(P.secondary), font: { ascii: "Times New Roman", eastAsia: "SimHei" } })],
  });
}

function body(text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    indent: { firstLine: 480 },
    spacing: { line: 312, after: 120 },
    children: [new TextRun({ text, size: 24, color: c(P.body), font: { ascii: "Times New Roman", eastAsia: "SimSun" } })],
  });
}

function bodyNoIndent(text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: 312, after: 120 },
    children: [new TextRun({ text, size: 24, color: c(P.body), font: { ascii: "Times New Roman", eastAsia: "SimSun" } })],
  });
}

function codeBlock(text) {
  return new Paragraph({
    spacing: { before: 80, after: 80, line: 276 },
    indent: { left: 400 },
    shading: { type: ShadingType.CLEAR, fill: "F0F4F8" },
    children: [new TextRun({ text, size: 20, color: "2D3748", font: { ascii: "Courier New" } })],
  });
}

function bullet(text) {
  return new Paragraph({
    spacing: { line: 312, after: 60 },
    indent: { left: 720, hanging: 360 },
    children: [
      new TextRun({ text: "\u2022 ", size: 24, color: c(P.accent), font: { ascii: "Times New Roman" } }),
      new TextRun({ text, size: 24, color: c(P.body), font: { ascii: "Times New Roman", eastAsia: "SimSun" } }),
    ],
  });
}

// Simple table helper
function simpleTable(headers, rows) {
  const colWidth = Math.floor(100 / headers.length);
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map(h => new TableCell({
      width: { size: colWidth, type: WidthType.PERCENTAGE },
      shading: { type: ShadingType.CLEAR, fill: c(P.accent) },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: c(P.accent) },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: c(P.accent) },
        left: { style: BorderStyle.NONE, size: 0 },
        right: { style: BorderStyle.NONE, size: 0 },
      },
      children: [new Paragraph({
        spacing: { before: 60, after: 60 },
        children: [new TextRun({ text: h, bold: true, size: 20, color: "FFFFFF", font: { ascii: "Calibri" } })],
      })],
    })),
  });

  const dataRows = rows.map((row, ri) => new TableRow({
    children: row.map(cell => new TableCell({
      width: { size: colWidth, type: WidthType.PERCENTAGE },
      shading: ri % 2 === 0 ? { type: ShadingType.CLEAR, fill: "FFFFFF" } : { type: ShadingType.CLEAR, fill: c(P.surface) },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
        left: { style: BorderStyle.NONE, size: 0 },
        right: { style: BorderStyle.NONE, size: 0 },
      },
      children: [new Paragraph({
        spacing: { before: 40, after: 40 },
        children: [new TextRun({ text: cell, size: 20, color: c(P.body), font: { ascii: "Calibri", eastAsia: "SimSun" } })],
      })],
    })),
  }));

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: "fixed",
    rows: [headerRow, ...dataRows],
  });
}

// === COVER R1 ===
function buildCoverR1(config) {
  const padL = 1200, padR = 800;
  const availableWidth = 11906 - padL - padR - 300;
  const titlePt = 36;
  const titleSize = titlePt * 2;
  const titleLines = ["Documentacao Tecnica", "FleetControl - Sistema de", "Ride Hailing Corporativo"];

  const accentLeft = { style: BorderStyle.SINGLE, size: 8, color: c(P.accent), space: 12 };
  const children = [];

  children.push(new Paragraph({ spacing: { before: 4500 } }));

  if (config.englishLabel) {
    children.push(new Paragraph({
      indent: { left: padL, right: padR }, spacing: { after: 500 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: c(P.accent), space: 8 } },
      children: [new TextRun({
        text: config.englishLabel.split("").join("  "),
        size: 18, color: c(P.accent), font: { ascii: "Calibri" }, characterSpacing: 40
      })],
    }));
  }

  for (let i = 0; i < titleLines.length; i++) {
    children.push(new Paragraph({
      indent: { left: padL },
      spacing: { after: i < titleLines.length - 1 ? 100 : 300, line: Math.ceil(titlePt * 23), lineRule: "atLeast" },
      children: [new TextRun({ text: titleLines[i], size: titleSize, bold: true,
        color: c(P.titleColor), font: { ascii: "Arial", eastAsia: "SimHei" } })],
    }));
  }

  if (config.subtitle) {
    children.push(new Paragraph({
      indent: { left: padL }, spacing: { after: 800 },
      children: [new TextRun({ text: config.subtitle, size: 24, color: c(P.subtitleColor),
        font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })],
    }));
  }

  for (const line of (config.metaLines || [])) {
    children.push(new Paragraph({
      indent: { left: padL + 200 }, spacing: { after: 80 },
      border: { left: accentLeft },
      children: [new TextRun({ text: line, size: 24, color: c(P.metaColor),
        font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })],
    }));
  }

  children.push(new Paragraph({ spacing: { before: 3000 } }));

  children.push(new Paragraph({
    indent: { left: padL, right: padR },
    border: { top: { style: BorderStyle.SINGLE, size: 2, color: c(P.accent), space: 8 } },
    spacing: { before: 200 },
    children: [
      new TextRun({ text: config.footerLeft || "", size: 16, color: c(P.footerColor), font: { ascii: "Arial" } }),
      new TextRun({ text: "                                                    " }),
      new TextRun({ text: config.footerRight || "", size: 16, color: c(P.footerColor), font: { ascii: "Arial" } }),
    ],
  }));

  return [new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: "fixed",
    borders: allNoBorders,
    rows: [new TableRow({
      height: { value: 16838, rule: "exact" },
      children: [new TableCell({
        shading: { type: ShadingType.CLEAR, fill: c(P.bg) }, borders: noBorders,
        children,
      })],
    })],
  })];
}

// === BODY CONTENT ===

const coverConfig = {
  title: "Documentacao Tecnica - FleetControl",
  subtitle: "Sistema de Gestao de Frota e Ride Hailing Corporativo",
  englishLabel: "TECHNICAL DOCUMENTATION",
  metaLines: [
    "Versao 1.0 | Agosto 2026",
    "Repositorio: github.com/superaplicativos/backend-demo",
    "Stack: Next.js 16 + TypeScript + Prisma + SQLite",
  ],
  footerLeft: "Super Aplicativos",
  footerRight: "Confidencial",
};

const bodyContent = [
  // ===== 1. RESUMO EXECUTIVO =====
  h1("1. Resumo Executivo"),
  body("Este documento apresenta a documentacao tecnica completa do FleetControl, um sistema corporativo de gestao de frota e ride hailing desenvolvido do zero. O sistema foi construido utilizando Next.js 16 com App Router, TypeScript, Tailwind CSS 4, shadcn/ui para a interface, Prisma ORM com SQLite para persistencia de dados, autenticacao JWT com refresh tokens, e Socket.io para rastreamento em tempo real."),
  body("A arquitetura segue o padrao de single-page dashboard com navegacao baseada em estados, onde uma unica pagina (DashboardShell) gerencia toda a interface administrativa. O backend e composto por 26+ rotas de API cobrindo autenticacao, gestao de usuarios, veiculos, motoristas, passageiros, centros de custo, regras de disponibilidade, viagens, checkouts de veiculos, relatorios, auditoria e metricas do sistema."),
  body("O sistema implementa controle de acesso baseado em funcoes (RBAC) com quatro niveis: SUPER_ADMIN, MANAGER, DRIVER e PASSENGER. Maquinas de estado validam transicoes de status de veiculos (5 estados) e viagens (6 estados). O modulo de geofencing utiliza a formula de Haversine para calculo de distancia e validacao temporal. Todos os endpoints de mutacao geram registros de auditoria append-only."),

  // ===== 2. ARQUITETURA DO SISTEMA =====
  h1("2. Arquitetura do Sistema"),

  h2("2.1 Visao Geral"),
  body("O FleetControl adota uma arquitetura monolitica modular, onde o frontend e o backend coexistem no mesmo projeto Next.js. Essa abordagem simplifica o deploy e a manutencao, sendo ideal para o estagio atual do projeto. A aplicacao principal roda como um servidor Next.js na porta 3000, enquanto um mini-servico de rastreamento WebSocket opera na porta 3000 utilizando Socket.io."),
  body("A separacao de preocupacoes ocorre em tres camadas principais: as rotas de API (src/app/api/) que implementam toda a logica de negocio, os componentes React (src/components/) que gerenciam a interface do usuario, e as bibliotecas utilitarias (src/lib/) que concentram logica compartilhada como autenticacao, auditoria, validacao de estados e geofencing. O Prisma atua como camada de acesso ao banco de dados, abstraindo completamente a interacao com o SQLite."),

  h2("2.2 Estrutura de Diretorios"),
  body("A estrutura do projeto segue as convencoes padrao do Next.js 16 com App Router, organizada de forma a manter a coesao entre rotas, componentes e logica de negocio. Abaixo esta a estrutura principal do projeto:"),
  codeBlock("src/"),
  codeBlock("  app/"),
  codeBlock("    api/            # 26+ rotas de API REST"),
  codeBlock("    page.tsx        # Pagina raiz (renderiza DashboardShell)"),
  codeBlock("  components/"),
  codeBlock("    dashboard/     # Shell, LoginForm, CrudTable"),
  codeBlock("    ui/             # Componentes shadcn/ui"),
  codeBlock("  lib/"),
  codeBlock("    auth.ts         # JWT, bcrypt, configuracao de tokens"),
  codeBlock("    auth-middleware.ts # getRequestUser(), requireRole()"),
  codeBlock("    audit.ts        # auditLog() - registro de auditoria"),
  codeBlock("    state-machine.ts # Transicoes de Vehicle e Ride"),
  codeBlock("    geofencing.ts   # Haversine, validacao temporal"),
  codeBlock("    api.ts          # apiFetch(), helpers de formatacao"),
  codeBlock("  stores/"),
  codeBlock("    auth-store.ts   # Zustand store com persistencia localStorage"),
  codeBlock("  types/"),
  codeBlock("    index.ts        # Tipos TypeScript (UserInfo, LoginResponse, etc.)"),
  codeBlock("prisma/"),
  codeBlock("  schema.prisma     # 12 entidades do modelo de dados"),
  codeBlock("  seed.ts           # Dados iniciais de demonstracao"),
  codeBlock("mini-services/"),
  codeBlock("  tracking-service/ # Servidor Socket.io para rastreamento"),

  // ===== 3. STACK TECNOLOGICO =====
  h1("3. Stack Tecnologico"),
  body("O conjunto de tecnologias escolhido prioriza produtividade, seguranca e escalabilidade dentro das restricoes de um projeto corporativo. Cada tecnologia foi selecionada com base em sua maturidade, comunidade de suporte e compatibilidade com os requisitos do sistema."),
  simpleTable(
    ["Camada", "Tecnologia", "Versao", "Proposito"],
    [
      ["Framework", "Next.js", "16", "App Router, SSR, API Routes"],
      ["Linguagem", "TypeScript", "5.x", "Tipagem estatica"],
      ["Estilo", "Tailwind CSS", "4.x", "Utilidades CSS"],
      ["UI Components", "shadcn/ui", "latest", "Componentes acessiveis"],
      ["ORM", "Prisma", "6.x", "Acesso ao banco de dados"],
      ["Banco de Dados", "SQLite", "3.x", "Persistencia local/producao"],
      ["Autenticacao", "JWT + bcrypt", "-", "Tokens de acesso e hash de senhas"],
      ["Estado Frontend", "Zustand", "5.x", "Gerenciamento de estado leve"],
      ["WebSocket", "Socket.io", "4.x", "Rastreamento em tempo real"],
      ["Deploy", "Vercel", "-", "Hospedagem e CI/CD"],
    ]
  ),
  body(""),

  // ===== 4. MODELO DE DADOS =====
  h1("4. Modelo de Dados"),

  h2("4.1 Entidades Principais"),
  body("O modelo de dados do FleetControl e composto por 12 entidades interconectadas que representam todos os dominios de negocio do sistema. O Prisma ORM gerencia todas as relacoes e migrations, garantindo integridade referencial e tipagem segura em tempo de compilacao. A seguir, apresentamos as entidades e suas responsabilidades dentro do sistema."),
  simpleTable(
    ["Entidade", "Descricao", "Relacoes Principais"],
    [
      ["User", "Usuarios do sistema com perfil e papel", "Driver, Passenger"],
      ["Vehicle", "Veiculos da frota com metadados", "Driver, VehicleMetadata"],
      ["VehicleMetadata", "Dados adicionais do veiculo (IPVA, seguro)", "Vehicle"],
      ["Driver", "Perfil do motorista com CNH e veiculo atual", "User, Vehicle, Ride"],
      ["Passenger", "Perfil do passageiro e centro de custo", "User, CostCenter, Ride"],
      ["CostCenter", "Centros de custo corporativos", "Passenger, CostCenterMetadata"],
      ["CostCenterMetadata", "Dados adicionais do centro de custo", "CostCenter"],
      ["AvailabilityRule", "Regras de disponibilidade de veiculos", "Vehicle"],
      ["Ride", "Registro de viagens com status", "Driver, Passenger, Vehicle, CostCenter"],
      ["VehicleCheckout", "Checkouts e devolucoes de veiculos", "Vehicle, Driver"],
      ["AuditLog", "Registro de auditoria append-only", "User"],
      ["RefreshToken", "Tokens de refresh para JWT", "User"],
    ]
  ),
  body(""),

  h2("4.2 Enumeracoes de Status"),
  body("Os status de veiculos e viagens sao controlados por maquinas de estado que garantem transicoes validas. Veiculos possuem 5 estados possiveis e viagens possuem 6 estados, cada um com regras especificas de transicao que impedem mudancas invalidas de status."),
  h3("Status de Veiculo (VehicleState)"),
  bullet("AVAILABLE - Disponivel para uso"),
  bullet("IN_USE - Em uso por um motorista"),
  bullet("MAINTENANCE - Em manutencao"),
  bullet("RETIRED - Aposentado da frota"),
  bullet("OUT_OF_SERVICE - Fora de servico temporariamente"),
  body(""),
  h3("Status de Viagem (RideStatus)"),
  bullet("REQUESTED - Viagem solicitada"),
  bullet("CONFIRMED - Confirmada pelo motorista"),
  bullet("IN_PROGRESS - Em andamento"),
  bullet("COMPLETED - Finalizada com sucesso"),
  bullet("CANCELLED - Cancelada"),
  bullet("NO_SHOW - Passageiro nao compareceu"),
  body(""),

  // ===== 5. AUTENTICACAO E AUTORIZACAO =====
  h1("5. Autenticacao e Autorizacao"),

  h2("5.1 Fluxo de Autenticacao JWT"),
  body("O sistema utiliza um esquema de autenticacao baseado em JSON Web Tokens (JWT) com dois tipos de tokens: access token e refresh token. O access token tem validade de 15 minutos e e enviado no header Authorization das requisicoes. O refresh token tem validade de 7 dias e e armazenado como cookie httpOnly no cliente, sendo utilizado para renovar automaticamente o access token quando expirado."),
  body("O processo de login envolve a verificacao das credenciais do usuario (email e senha), comparacao do hash bcrypt da senha com 10 rounds de salt, e geracao dos dois tokens. O rate limiting e aplicado no endpoint de login, permitindo no maximo 5 tentativas em um intervalo de 15 minutos por endereco IP. As chaves secretas JWT estao configuradas em src/lib/auth.ts."),

  h2("5.2 Middleware de Autenticacao"),
  body("O arquivo src/lib/auth-middleware.ts exporta duas funcoes principais utilizadas em todas as rotas protegidas. A funcao getRequestUser(request) extrai o token do header Authorization, valida sua integridade e retorna os dados do usuario decodificados. Ja a funcao requireRole(roles) atua como wrapper, verificando se o usuario possui uma das funcoes exigidas para acessar determinado endpoint."),
  body("O frontend utiliza a funcao apiFetch() definida em src/lib/api.ts para todas as chamadas de API. Esta funcao intercepta respostas 401 (Unauthorized) e tenta renovar o token automaticamente usando o refresh token. Se a renovacao falhar, o usuario e redirecionado para a tela de login. O estado de autenticacao e gerenciado pelo Zustand store em src/stores/auth-store.ts com persistencia no localStorage."),

  h2("5.3 Controle de Acesso RBAC"),
  body("O sistema implementa Role-Based Access Control com quatro niveis hierarquicos de acesso. Cada funcao define um conjunto de permissoes que determina quais endpoints e funcionalidades o usuario pode acessar. As permissoes sao verificadas tanto no backend (via requireRole) quanto no frontend (condicionalmente renderizando componentes com base na funcao do usuario)."),
  simpleTable(
    ["Funcao", "Descricao", "Permissoes"],
    [
      ["SUPER_ADMIN", "Administrador total do sistema", "Acesso completo a todos os modulos e configuracoes"],
      ["MANAGER", "Gerente de frota", "Gestao de viagens, veiculos, relatorios e motoristas"],
      ["DRIVER", "Motorista", "Visualizacao de viagens atribuidas e checkout de veiculos"],
      ["PASSENGER", "Passageiro", "Solicitacao de viagens e visualizacao de historico"],
    ]
  ),
  body(""),

  // ===== 6. MAQUINAS DE ESTADO =====
  h1("6. Maquinas de Estado"),
  body("O sistema utiliza maquinas de estado para validar todas as transicoes de status de veiculos e viagens. A implementacao fica em src/lib/state-machine.ts e utiliza um mapa de transicoes validas que impede mudancas invalidas de status. Cada chamada de transicao e registrada no log de auditoria."),

  h2("6.1 Transicoes de Veiculo"),
  body("O veiculo inicia no estado AVAILABLE e pode transitar para IN_USE (quando um motorista faz checkout), MAINTENANCE (quando enviado para manutencao), ou OUT_OF_SERVICE. De IN_USE, retorna para AVAILABLE (devolucao). De MAINTENANCE, pode voltar para AVAILABLE ou ser RETIRED permanentemente. Cada transicao requer a verificacao de pre-condicoes especificas, como a existencia de um motorista atribuido para IN_USE."),
  simpleTable(
    ["De", "Para", "Condicao"],
    [
      ["AVAILABLE", "IN_USE", "Checkout por motorista"],
      ["IN_USE", "AVAILABLE", "Devolucao pelo motorista"],
      ["AVAILABLE", "MAINTENANCE", "Solicitacao de manutencao"],
      ["MAINTENANCE", "AVAILABLE", "Conclusao de manutencao"],
      ["MAINTENANCE", "RETIRED", "Baixa permanente"],
      ["AVAILABLE", "OUT_OF_SERVICE", "Desativacao temporaria"],
      ["OUT_OF_SERVICE", "AVAILABLE", "Reativacao"],
    ]
  ),
  body(""),

  h2("6.2 Transicoes de Viagem"),
  body("A viagem comeca no estado REQUESTED quando um passageiro solicita o servico. O motorista pode CONFIRMAR ou CANCELAR a viagem. Uma vez confirmada, a viagem entra em IN_PROGRESS e so pode finalizar como COMPLETED, CANCELLED ou NO_SHOW. Todas as transicoes invalidas sao rejeitadas pela funcao canTransition() e geram erro com a lista de estados destino validos."),

  // ===== 7. GEOFENCING =====
  h1("7. Geofencing"),
  body("O modulo de geofencing, implementado em src/lib/geofencing.ts, utiliza a formula de Haversine para calcular a distancia entre dois pontos geograficos dados por coordenadas de latitude e longitude. Alem da validacao espacial (distancia maxima), o modulo tambem implementa validacao temporal, verificando se a solicitacao de viagem esta dentro dos horarios e dias permitidos pela regra de disponibilidade do veiculo."),
  body("A funcao principal validateRideRequest() recebe as coordenadas de origem e destino, o raio maximo permitido, as regras de disponibilidade e o horario atual. Ela retorna um objeto com o status de validacao e mensagens de erro descritivas caso alguma restricao seja violada. O calculo de distancia utiliza o raio da Terra de 6.371 km como constante."),

  // ===== 8. ROTAS DE API =====
  h1("8. Rotas de API"),
  body("O sistema possui 26+ rotas de API organizadas em grupos funcionais sob o diretorio src/app/api/. Todas as rotas seguem o padrao RESTful com response wrapping padronizado: { success: boolean, data: T | null, error?: string }. A seguir, apresentamos o mapeamento completo dos endpoints."),
  simpleTable(
    ["Grupo", "Rota", "Metodo", "Descricao"],
    [
      ["Auth", "/api/auth/login", "POST", "Autenticacao com email e senha"],
      ["Auth", "/api/auth/refresh", "POST", "Renovacao do access token"],
      ["Auth", "/api/auth/me", "GET", "Dados do usuario autenticado"],
      ["Auth", "/api/auth/logout", "POST", "Invalidacao do refresh token"],
      ["Users", "/api/users", "GET/POST", "Listagem e criacao de usuarios"],
      ["Users", "/api/users/[id]", "GET/PUT/DELETE", "CRUD individual de usuario"],
      ["Vehicles", "/api/vehicles", "GET/POST", "Listagem e criacao de veiculos"],
      ["Vehicles", "/api/vehicles/[id]", "GET/PUT/DELETE", "CRUD individual de veiculo"],
      ["Vehicles", "/api/vehicles/[id]/metadata", "GET/PUT", "Metadados do veiculo"],
      ["Drivers", "/api/drivers", "GET/POST", "Listagem e criacao de motoristas"],
      ["Drivers", "/api/drivers/[id]", "GET/PUT/DELETE", "CRUD individual de motorista"],
      ["Passengers", "/api/passengers", "GET/POST", "Listagem e criacao de passageiros"],
      ["Cost Centers", "/api/cost-centers", "GET/POST", "Listagem e criacao de centros de custo"],
      ["Cost Centers", "/api/cost-centers/[id]/metadata", "GET/PUT", "Metadados do centro de custo"],
      ["Rules", "/api/rules", "GET/POST", "Regras de disponibilidade"],
      ["Rules", "/api/rules/[id]", "PUT/DELETE", "Atualizacao e remocao de regras"],
      ["Rides", "/api/rides", "GET/POST", "Listagem e criacao de viagens"],
      ["Rides", "/api/rides/[id]", "GET/PUT", "Detalhes e atualizacao de viagem"],
      ["Rides", "/api/rides/[id]/dispatch", "POST", "Designacao de motorista e veiculo"],
      ["Checkouts", "/api/checkouts", "GET/POST", "Checkouts de veiculos"],
      ["Checkouts", "/api/checkouts/[id]/return", "POST", "Devolucao de veiculo"],
      ["Reports", "/api/reports/rides", "GET", "Relatorio de viagens (XLSX/CSV)"],
      ["Audit", "/api/audit-logs", "GET", "Consulta de logs de auditoria"],
      ["System", "/api/health", "GET", "Health check do sistema"],
      ["System", "/api/metrics", "GET", "Metricas gerais do dashboard"],
    ]
  ),
  body(""),

  // ===== 9. FRONTEND =====
  h1("9. Frontend - Dashboard"),

  h2("9.1 Arquitetura da Interface"),
  body("O frontend utiliza uma arquitetura de single-page dashboard implementada no componente DashboardShell (src/components/dashboard/dashboard-shell.tsx). Este componente gerencia toda a navegacao e renderizacao das paginas atraves de um estado interno (activePage), eliminando a necessidade de roteamento entre multiplas paginas. O sidebar apresenta as opcoes de navegacao de forma condicional baseada na funcao do usuario autenticado."),
  body("O componente CrudTable e um componente generico reutilizavel que implementa operacoes de Create, Read, Update e Delete para qualquer entidade. Ele recebe configuracoes como colunas, endpoint de API, campos do formulario e permissoes, gerando automaticamente a tabela de dados com busca, paginacao e modais de criacao/edicao. Este padrao foi utilizado para todas as telas de gestao: Usuarios, Veiculos, Motoristas, Passageiros, Centros de Custo e Regras."),

  h2("9.2 Pagina de Login"),
  body("O formulario de login (src/components/dashboard/login-form.tsx) exibe campos de email e senha com validacao client-side. Apos a autenticacao bem-sucedida, o access token e o refresh token sao armazenados no Zustand store e no localStorage, respectivamente. O formulario tambem exibe credenciais de demonstracao para facilitar testes: admin@corporate.com / Admin@123 (Super Admin) e manager@corporate.com / Manager@123 (Gerente)."),

  h2("9.3 Pagina Overview"),
  body("A pagina inicial do dashboard apresenta um resumo com cartoes de metricas (total de usuarios, veiculos, viagens do mes, motoristas ativos), um grafico de viagens por status e uma lista das ultimas atividades. Os dados sao obtidos atraves do endpoint /api/metrics e atualizados sempre que o usuario navega de volta para a pagina. O padrao reloadKey e utilizado para forcar re-fetch dos dados apos operacoes de mutacao."),

  // ===== 10. WEBSOCKET TRACKING =====
  h1("10. Mini-Servico de Rastreamento (WebSocket)"),
  body("O servico de rastreamento esta localizado em mini-services/tracking-service/ e opera como um servidor Socket.io independente na porta 3003. Este servico gerencia salas (rooms) para comunicacao direcionada, incluindo uma sala global 'dashboard' para broadcasts e salas especificas por viagem ('ride-{rideId}'). O evento principal 'simulate-tracking' emite atualizacoes de posicao geografica simuladas para uma viagem especifica."),
  body("A arquitetura separada permite que o servico de rastreamento escale independentemente do servidor principal. Em producao, o recomendado e utilizar um servico de mensageria como Redis Pub/Sub para sincronizacao entre multiplas instancias. O frontend pode se conectar a este servico utilizando o cliente Socket.io para receber atualizacoes em tempo real sobre a posicao dos veiculos durante viagens em andamento."),

  // ===== 11. RELATORIOS E EXPORTACAO =====
  h1("11. Relatorios e Exportacao"),
  body("O modulo de relatorios esta acessivel atraves do endpoint /api/reports/rides e suporta exportacao nos formatos XLSX e CSV. O endpoint aceita parametros de filtro como data inicial, data final, status da viagem e centro de custo, gerando um arquivo para download com os dados filtrados. A geracao do arquivo XLSX utiliza a biblioteca ExcelJS no servidor, criando uma planilha com cabecalhos formatados e colunas de data no formato brasileiro (DD/MM/YYYY)."),
  body("A tela de relatorios no frontend permite ao usuario selecionar o formato desejado, aplicar filtros e baixar o arquivo gerado. Alem dos relatorios de viagens, o sistema tambem disponibiliza um endpoint de metricas gerais (/api/metrics) que retorna dados agregados para o dashboard, incluindo contagem de usuarios por funcao, distribuicao de status de veiculos e viagens, e estatisticas mensais."),

  // ===== 12. AUDITORIA =====
  h1("12. Sistema de Auditoria"),
  body("Todas as operacoes de mutacao (criacao, atualizacao, exclusao) realizadas atraves das rotas de API geram automaticamente registros de auditoria. A funcao auditLog(), definida em src/lib/audit.ts, cria um registro na tabela AuditLog contendo o ID do usuario que realizou a acao, a acao executada (CREATE, UPDATE, DELETE), a entidade afetada, o ID do registro, os dados anteriores e os novos dados serializados como JSON."),
  body("Os registros de auditoria seguem o padrao append-only, ou seja, uma vez criados nao podem ser modificados ou excluidos. Isso garante a rastreabilidade completa de todas as acoes realizadas no sistema. A tela de auditoria no dashboard permite filtrar os logs por usuario, acao e entidade, facilitando investigacoes e conformidade regulatoria."),

  // ===== 13. GUIA DE DEPLOY =====
  h1("13. Guia de Deploy"),

  h2("13.1 Push para o GitHub"),
  body("O codigo ja esta versionado com Git e o remote configurado para github.com/superaplicativos/backend-demo. Para fazer o push manualmente, siga os passos abaixo. E necessario ter um Personal Access Token (PAT) com permissao 'repo' gerado em github.com/settings/tokens."),
  bodyNoIndent("Passo 1: Abra o terminal na raiz do projeto."),
  bodyNoIndent("Passo 2: Configure suas credenciais do Git:"),
  codeBlock("git config user.name \"Seu Nome\""),
  codeBlock("git config user.email \"seu@email.com\""),
  bodyNoIndent("Passo 3: Se ainda nao tiver o remote configurado:"),
  codeBlock("git remote add origin https://<TOKEN>@github.com/superaplicativos/backend-demo.git"),
  bodyNoIndent("Passo 4: Faca o push:"),
  codeBlock("git push -u origin main"),
  body("Se o remote ja estiver configurado sem o token, atualize a URL:"),
  codeBlock("git remote set-url origin https://<TOKEN>@github.com/superaplicativos/backend-demo.git"),
  body(""),

  h2("13.2 Deploy na Vercel"),
  body("O deploy na Vercel pode ser feito de duas formas: pela interface web ou pela CLI. Recomenda-se a CLI para maior controle sobre as variaveis de ambiente e configuracoes de build."),
  bodyNoIndent("Opcao A - Pela interface web:"),
  bullet("Acesse vercel.com e faca login com sua conta GitHub"),
  bullet("Clique em 'Add New' > 'Project'"),
  bullet("Selecione o repositorio superaplicativos/backend-demo"),
  bullet("Em Framework Preset, selecione 'Next.js'"),
  bullet("Em Environment Variables, adicione as variaveis necessarias (veja secao 14)"),
  bullet("Clique em 'Deploy' e aguarde a conclusao"),
  body(""),
  bodyNoIndent("Opcao B - Pela CLI (recomendada):"),
  codeBlock("npm i -g vercel"),
  codeBlock("vercel login"),
  codeBlock("cd /caminho/do/projeto"),
  codeBlock("vercel --prod"),
  body("A CLI vai perguntar o nome do projeto e as configuracoes. Confirme com os valores padrao. Para configurar variaveis de ambiente via CLI:"),
  codeBlock("vercel env add DATABASE_URL production"),
  codeBlock("vercel env add JWT_SECRET production"),
  codeBlock("vercel env add JWT_REFRESH_SECRET production"),
  body(""),

  h2("13.3 Banco de Dados em Producao"),
  body("O SQLite local nao funciona na Vercel (filesystem efemero). Para producao, e necessario migrar para um banco de dados suportado. As opcoes recomendadas sao: Supabase (PostgreSQL gratuito), Vercel Postgres, ou Neon PostgreSQL. A migracao envolve alterar a DATABASE_URL no .env para a connection string do PostgreSQL e rodar npx prisma db push para sincronizar o schema."),
  body("Para o Supabase: crie um projeto em supabase.com, copie a connection string (Project Settings > Database), configure-a como DATABASE_URL. Certifique-se de habilitar 'Connection Pooling' e usar a URL de pool (com pgBouncer) para a Vercel. O schema Prisma ja e compativel com PostgreSQL sem alteracoes significativas, bastando ajustar o provider no schema.prisma de 'sqlite' para 'postgresql'."),

  // ===== 14. CONFIGURACAO =====
  h1("14. Configuracao e Variaveis de Ambiente"),
  body("O sistema utiliza variaveis de ambiente para configuracao sensivel e especifica de cada ambiente. O arquivo .env.example na raiz do projeto documenta todas as variaveis necessarias. Abaixo esta a lista completa com descricoes detalhadas."),
  simpleTable(
    ["Variavel", "Exemplo", "Descricao"],
    [
      ["DATABASE_URL", "file:./db/custom.db", "URL de conexao com o banco de dados"],
      ["JWT_SECRET", "corporate-ride-hailing-secret-key-2024", "Chave secreta para access tokens"],
      ["JWT_REFRESH_SECRET", "corporate-ride-hailing-refresh-secret-key-2024", "Chave secreta para refresh tokens"],
    ]
  ),
  body(""),
  body("As chaves JWT devem ser alteradas para valores seguros e unicos em producao. Recomenda-se gerar chaves com pelo menos 32 caracteres alfanumericos. Nunca compartilhe ou commit o arquivo .env - ele esta listado no .gitignore e o .env.example deve ser usado como referencia para novos ambientes."),

  // ===== 15. SEED DATA =====
  h1("15. Dados de Demonstracao (Seed)"),
  body("O script de seed (prisma/seed.ts) popula o banco de dados com dados iniciais para demonstracao e testes. Os dados incluem dois usuarios administrativos, tres veiculos, dois motoristas, dois passageiros, dois centros de custo, uma regra de disponibilidade e uma viagem concluida. Para executar o seed:"),
  codeBlock("npx prisma db seed"),
  body("As credenciais de acesso padrao criadas pelo seed sao:"),
  simpleTable(
    ["Email", "Senha", "Funcao"],
    [
      ["admin@corporate.com", "Admin@123", "SUPER_ADMIN"],
      ["manager@corporate.com", "Manager@123", "MANAGER"],
    ]
  ),
  body(""),

  // ===== 16. CHECKLIST DE DEPLOY =====
  h1("16. Checklist de Deploy"),
  body("Utilize esta lista de verificacao para garantir que todos os passos foram seguidos antes e apos o deploy em producao."),
  bullet("Codigo pushed para GitHub com todos os commits"),
  bullet("Variaveis de ambiente configuradas na Vercel (DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET)"),
  bullet("Banco de dados PostgreSQL criado (Supabase/Neon/Vercel Postgres)"),
  bullet("Provider no schema.prisma alterado de 'sqlite' para 'postgresql'"),
  bullet("Migrations aplicadas: npx prisma db push ou npx prisma migrate deploy"),
  bullet("Seed executado em producao para dados iniciais (opcional)"),
  bullet("Build local bem-sucedido: npm run build"),
  bullet("Deploy na Vercel concluido sem erros"),
  bullet("Health check acessivel: https://seu-dominio.vercel.app/api/health"),
  bullet("Login funcional com credenciais de producao"),
  bullet("Rate limiting verificado (5 tentativas / 15 minutos)"),
  bullet("WebSocket service configurado separadamente se necessario"),
];

// === ASSEMBLE DOCUMENT ===
const doc = new Document({
  styles: {
    default: {
      document: {
        run: {
          font: { ascii: "Times New Roman", eastAsia: "SimSun" },
          size: 24, color: c(P.body),
        },
        paragraph: { spacing: { line: 312 } },
      },
      heading1: {
        run: {
          font: { ascii: "Times New Roman", eastAsia: "SimHei" },
          size: 32, bold: true, color: c(P.primary),
        },
      },
      heading2: {
        run: {
          font: { ascii: "Times New Roman", eastAsia: "SimHei" },
          size: 28, bold: true, color: c(P.primary),
        },
      },
      heading3: {
        run: {
          font: { ascii: "Times New Roman", eastAsia: "SimHei" },
          size: 24, bold: true, color: c(P.secondary),
        },
      },
    },
  },
  sections: [
    // Cover section
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 0, bottom: 0, left: 0, right: 0 },
        },
      },
      children: buildCoverR1(coverConfig),
    },
    // TOC section
    {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
          pageNumbers: { start: 1, formatType: "upperRoman" },
        },
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "808080" })],
          })],
        }),
      },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 480, after: 360 },
          children: [new TextRun({ text: "Sumario", bold: true, size: 32, font: { ascii: "Times New Roman", eastAsia: "SimHei" }, color: c(P.primary) })],
        }),
        new TableOfContents("Sumario", {
          hyperlink: true,
          headingStyleRange: "1-3",
        }),
        new Paragraph({
          spacing: { before: 200 },
          children: [new TextRun({
            text: "Nota: Para atualizar os numeros de pagina, clique com o botao direito no sumario e selecione \"Atualizar Campo\".",
            italics: true, size: 18, color: "888888",
          })],
        }),
        new Paragraph({ children: [new PageBreak()] }),
      ],
    },
    // Body section
    {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
          pageNumbers: { start: 1, formatType: "decimal" },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: "FleetControl - Documentacao Tecnica", size: 18, color: "808080", font: { ascii: "Calibri" } })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "808080" })],
          })],
        }),
      },
      children: bodyContent,
    },
  ],
});

// Generate
const OUTPUT = "/home/z/my-project/download/FleetControl-Documentacao-Tecnica-Dev.docx";
Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(OUTPUT, buf);
  console.log("Dev doc generated:", OUTPUT);
});
