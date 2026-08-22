const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, PageNumber, NumberFormat, AlignmentType, HeadingLevel,
  WidthType, BorderStyle, ShadingType, PageBreak, TableOfContents, SectionType,
} = require('docx');

// ─── Palette: DM-1 Deep Cyan (tech report) ───
const P = {
  bg: '162235', titleColor: 'FFFFFF', subtitleColor: 'B0B8C0',
  metaColor: '90989F', footerColor: '687078', accent: '37DCF2',
  primary: '0F172A', body: '000000', secondary: '5B6B7D',
  table: { headerBg: '1B6B7A', headerText: 'FFFFFF', accentLine: '1B6B7A', innerLine: 'C8DDE2', surface: 'EDF3F5' }
};
const c = (hex) => hex.replace('#', '');

// ─── Borders ───
const NB = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const noBorders = { top: NB, bottom: NB, left: NB, right: NB };
const allNoBorders = { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB };
const tableBorders = {
  top: { style: BorderStyle.SINGLE, size: 2, color: c(P.table.accentLine) },
  bottom: { style: BorderStyle.SINGLE, size: 2, color: c(P.table.accentLine) },
  left: BorderStyle.NONE, right: BorderStyle.NONE,
  insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: c(P.table.innerLine) },
  insideVertical: BorderStyle.NONE,
};

// ─── Helpers ───
function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 480, after: 200 },
    children: [new TextRun({ text, bold: true, size: 32, color: c(P.primary), font: { ascii: 'Calibri', eastAsia: 'SimHei' } })] });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 360, after: 160 },
    children: [new TextRun({ text, bold: true, size: 28, color: c(P.primary), font: { ascii: 'Calibri', eastAsia: 'SimHei' } })] });
}
function h3(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true, size: 24, color: c(P.primary), font: { ascii: 'Calibri', eastAsia: 'SimHei' } })] });
}
function p(text) {
  return new Paragraph({ spacing: { after: 120, line: 312 }, indent: { firstLine: 480 },
    children: [new TextRun({ text, size: 24, color: c(P.body), font: { ascii: 'Calibri', eastAsia: 'Microsoft YaHei' } })] });
}
function pNI(text) {
  return new Paragraph({ spacing: { after: 120, line: 312 },
    children: [new TextRun({ text, size: 24, color: c(P.body), font: { ascii: 'Calibri', eastAsia: 'Microsoft YaHei' } })] });
}
function code(text) {
  return new Paragraph({ spacing: { after: 40, line: 276 },
    indent: { left: 400 },
    children: [new TextRun({ text, size: 20, color: '2D6A6A', font: { ascii: 'Consolas' } })] });
}
function bold(text) {
  return new TextRun({ text, bold: true, size: 24, color: c(P.body), font: { ascii: 'Calibri' } });
}
function normal(text) {
  return new TextRun({ text, size: 24, color: c(P.body), font: { ascii: 'Calibri', eastAsia: 'Microsoft YaHei' } });
}
function mixed(runs) {
  return new Paragraph({ spacing: { after: 120, line: 312 }, indent: { firstLine: 480 }, children: runs });
}
function mixedNI(runs) {
  return new Paragraph({ spacing: { after: 120, line: 312 }, children: runs });
}
function headerCell(text) {
  return new TableCell({ shading: { type: ShadingType.CLEAR, fill: c(P.table.headerBg) },
    borders: tableBorders, margins: { top: 60, bottom: 60, left: 120, right: 120 }, tableHeader: true, cantSplit: true,
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 21, color: c(P.table.headerText), font: { ascii: 'Calibri' } })] })] });
}
function dataCell(text, idx) {
  return new TableCell({ shading: { type: ShadingType.CLEAR, fill: idx % 2 === 0 ? c(P.table.surface) : 'FFFFFF' },
    borders: tableBorders, margins: { top: 60, bottom: 60, left: 120, right: 120 }, cantSplit: true,
    children: [new Paragraph({ children: [new TextRun({ text: String(text || '-'), size: 21, color: c(P.body), font: { ascii: 'Calibri' } })] })] });
}
function dataCellMono(text, idx) {
  return new TableCell({ shading: { type: ShadingType.CLEAR, fill: idx % 2 === 0 ? c(P.table.surface) : 'FFFFFF' },
    borders: tableBorders, margins: { top: 60, bottom: 60, left: 120, right: 120 }, cantSplit: true,
    children: [new Paragraph({ children: [new TextRun({ text: String(text || '-'), size: 20, color: '2D6A6A', font: { ascii: 'Consolas' } })] })] });
}
function simpleTable(headers, rows) {
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, layout: 'fixed', borders: tableBorders,
    rows: [
      new TableRow({ tableHeader: true, cantSplit: true, children: headers.map(h => headerCell(h)) }),
      ...rows.map((r, i) => new TableRow({ cantSplit: true, children: r.map(cell => dataCell(cell, i)) })),
    ] });
}

// ─── Cover R1 ───
function buildCover() {
  const padL = 1200, padR = 800;
  const children = [];
  children.push(new Paragraph({ spacing: { before: 4800 } }));
  children.push(new Paragraph({ indent: { left: padL, right: padR }, spacing: { after: 500 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: c(P.accent), space: 8 } },
    children: [new TextRun({ text: 'F L E E T C O N T R O L', size: 18, color: c(P.accent), font: { ascii: 'Calibri' }, characterSpacing: 40 })],
  }));
  children.push(new Paragraph({ indent: { left: padL }, spacing: { after: 200, line: 920, lineRule: 'atLeast' },
    children: [new TextRun({ text: 'Documentacao Forense', size: 72, bold: true, color: c(P.titleColor), font: { ascii: 'Calibri', eastAsia: 'SimHei' } })],
  }));
  children.push(new Paragraph({ indent: { left: padL }, spacing: { after: 200, line: 680, lineRule: 'atLeast' },
    children: [new TextRun({ text: 'do Codigo-Fonte', size: 56, bold: true, color: c(P.titleColor), font: { ascii: 'Calibri', eastAsia: 'SimHei' } })],
  }));
  children.push(new Paragraph({ indent: { left: padL }, spacing: { after: 800 },
    children: [new TextRun({ text: 'Ride Hailing Corporativo — Analise Exaustiva de Cada Arquivo, Funcao e Decisao de Design', size: 24, color: c(P.subtitleColor), font: { ascii: 'Calibri', eastAsia: 'Microsoft YaHei' } })],
  }));
  const accentLeft = { style: BorderStyle.SINGLE, size: 8, color: c(P.accent), space: 12 };
  const metaLines = ['Repositorio: github.com/superaplicativos/Ride-Hailing-Corporativo', 'Stack: Next.js 16 / TypeScript / Prisma 6 / Tailwind CSS 4 / shadcn/ui', 'Data: Agosto 2025 | Versao: 1.0.0 | Confidencial'];
  for (const line of metaLines) {
    children.push(new Paragraph({ indent: { left: padL + 200 }, spacing: { after: 80 },
      border: { left: accentLeft },
      children: [new TextRun({ text: line, size: 22, color: c(P.metaColor), font: { ascii: 'Calibri' } })],
    }));
  }
  children.push(new Paragraph({ spacing: { before: 3000 } }));
  children.push(new Paragraph({ indent: { left: padL, right: padR },
    border: { top: { style: BorderStyle.SINGLE, size: 2, color: c(P.accent), space: 8 } },
    children: [new TextRun({ text: 'Super Aplicativos', size: 16, color: c(P.footerColor), font: { ascii: 'Calibri' })],
  }));
  return [new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, layout: 'fixed', borders: allNoBorders,
    rows: [new TableRow({ height: { value: 16838, rule: 'exact' },
      children: [new TableCell({ shading: { type: ShadingType.CLEAR, fill: c(P.bg) }, borders: noBorders, children })] })] })];
}

// ─── Page number footer ───
function pageNumFooter(format) {
  const instrText = format === 'roman' ? 'PAGE \\* ROMAN \\* MERGEFORMAT' : 'PAGE \\* arabic \\* MERGEFORMAT';
  return new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
    children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '808080' })] })] });
}

// ═══════════════════════════════════════════════════════════════════
// CONTENT SECTIONS
// ═══════════════════════════════════════════════════════════════════

const content = [];

// ─── 1. Visao Geral do Projeto ───
content.push(h1('1. Visao Geral do Projeto'));
content.push(p('FleetControl e um sistema fullstack de ride hailing corporativo construido sobre Next.js 16 com App Router, TypeScript, Prisma ORM, Tailwind CSS 4 e shadcn/ui. O projeto implementa um painel administrativo completo (SPA) com 11 paginas, 26 API routes, 12 modelos de banco de dados, autenticacao JWT com refresh tokens, maquinas de estado para veiculos e viagens, geofencing via formula de Haversine, auditoria completa e um servico de rastreamento WebSocket independente.'));
content.push(p('A arquitetura segue o principio API-first: toda logica de negocio reside nos API routes em src/app/api/, enquanto o dashboard (src/components/dashboard/dashboard-shell.tsx) e um consumidor puro que utiliza a funcao apiFetch() client-side com auto-refresh de tokens. O estado global do cliente e gerenciado pelo Zustand (auth-store.ts), e a navegacao interna e controlada por estado (currentPage) sem utilizar rotas Next.js para as paginas do dashboard.'));

content.push(h2('1.1 Metricas do Codigo-Fonte'));
content.push(simpleTable(
  ['Metrica', 'Quantidade', 'Detalhes'],
  [
    ['Arquivos TypeScript/TSX', '92', 'Inclui componentes, libs, stores, types, routes, hooks'],
    ['API Routes', '26', 'Distribuidos em 12 grupos funcionais sob src/app/api/'],
    ['Modelos Prisma', '12', 'User, Vehicle, VehicleMetadata, Driver, Passenger, CostCenter, CostCenterMetadata, AvailabilityRule, Ride, VehicleCheckout, AuditLog, RefreshToken'],
    ['Componentes shadcn/ui', '~30', 'Em src/components/ui/'],
    ['Linhas dashboard-shell.tsx', '1120', 'SPA completo com sidebar, topbar, 10 paginas, CrudTable generico'],
    ['Linhas lib/*', '~430', 'auth.ts (91), api.ts (151), geofencing.ts (88), state-machine.ts (24), audit.ts (26), auth-middleware.ts (37), db.ts (12)'],
    ['Scripts NPM', '7', 'dev, build, start, lint, db:push, db:generate, db:migrate, db:reset'],
    ['Dependencias producao', '~45', 'Inclui next, react, prisma, socket.io, xlsx, zustand, zod, bcryptjs, jsonwebtoken, lucide-react, etc.'],
  ]
));

content.push(h2('1.2 Diagrama de Dependencias entre Camadas'));
content.push(p('O sistema e organizado em 5 camadas com dependencias unidirecionais. A camada de Apresentacao (dashboard-shell.tsx + components/ui) depende da camada de Estado (auth-store.ts) e da camada de Comunicacao (api.ts). A camada de Comunicacao depende da camada de Negocio (api routes + libs). A camada de Negocio depende da camada de Dados (Prisma + DB). Nao ha dependencias ciclicas: camadas inferiores nunca importam de camadas superiores. Esta separacao permite trocar qualquer camada independentemente, como documentado no MIGRATION-GUIDE.md do repositorio.'));

// ─── 2. Database Schema ───
content.push(h1('2. Database Schema — Prisma'));
content.push(p('O schema Prisma (prisma/schema.prisma) define 12 modelos com 272 linhas de codigo. Utiliza SQLite como provider em desenvolvimento e esta pronto para PostgreSQL em producao (basta mudar o provider e a DATABASE_URL). Enums sao simulados via String com comentarios documentando os valores validos, pois SQLite nativo nao suporta enums.'));

content.push(h2('2.1 Modelo User'));
content.push(p('O modelo User e a entidade central do sistema, servindo como base para todos os atores: administradores, gerentes, motoristas e passageiros. Cada usuario possui um email unico, senha hasheada via bcryptjs (10 salt rounds), e um papel (role) que define suas permissoes. O campo branchId permite hierarquia corporativa por filial, enquanto isActive implementa soft delete — usuarios nunca sao removidos fisicamente do banco, apenas desativados.'));
content.push(simpleTable(
  ['Campo', 'Tipo', 'Restricoes', 'Descricao'],
  [
    ['id', 'String', '@id @default(cuid())', 'Identificador unico gerado pelo CUID'],
    ['email', 'String', '@unique', 'Email de login, unico no sistema'],
    ['name', 'String', '-', 'Nome de exibicao do usuario'],
    ['passwordHash', 'String', '-', 'Hash bcrypt da senha (nunca texto plano)'],
    ['role', 'String', '@default(PASSENGER)', 'SUPER_ADMIN, MANAGER, DRIVER, PASSENGER'],
    ['branchId', 'String?', '-', 'ID da filial corporativa (opcional)'],
    ['branchName', 'String?', '-', 'Nome da filial para exibicao (opcional)'],
    ['isActive', 'Boolean', '@default(true)', 'Soft delete — false = desativado'],
    ['createdAt', 'DateTime', '@default(now())', 'Data de criacao automatica'],
    ['updatedAt', 'DateTime', '@updatedAt', 'Atualizacao automatica em qualquer mutation'],
  ]
));
content.push(p('Relacoes: User tem relacao 1:1 opcional com Driver (via userId unique) e 1:1 opcional com Passenger (via userId unique). Tambem tem relacao 1:N com AuditLog e RefreshToken, ambas com onDelete: Cascade — remover um usuario remove automaticamente seus logs de auditoria e tokens.'));

content.push(h2('2.2 Modelo Vehicle'));
content.push(p('Representa veiculos da frota com placa unica, capacidade, status gerenciado por maquina de estado, e metadados customizaveis. A relacao currentDriver com Driver e 1:1, implementada via @relation com nome explicito para desambiguar. O campo trackerId permite integracao com APIs de rastreamento externas.'));
content.push(simpleTable(
  ['Campo', 'Tipo', 'Restricoes', 'Descricao'],
  [
    ['id', 'String', '@id @default(cuid())', 'Identificador unico'],
    ['plate', 'String', '@unique', 'Placa do veiculo (formato brasileiro)'],
    ['model', 'String', '-', 'Modelo do veiculo (ex: Toyota Corolla 2023)'],
    ['capacity', 'Int', '@default(4)', 'Capacidade de passageiros'],
    ['trackerId', 'String?', '-', 'ID do rastreador GPS externo'],
    ['status', 'String', '@default(AVAILABLE)', 'AVAILABLE, EN_ROUTE, IN_RIDE, OFFLINE, MAINTENANCE'],
    ['color', 'String?', '-', 'Cor do veiculo'],
    ['year', 'Int?', '-', 'Ano de fabricacao'],
  ]
));

content.push(h2('2.3 Modelo Driver'));
content.push(p('Perfil de motorista vinculado a um User (1:1 via userId @unique). Possui dados de CNH (licenseNumber, licenseExpiry), telefone, status proprio (AVAILABLE, OFF_DUTY, IN_RIDE) e relacao 1:1 opcional com Vehicle via currentVehicleId @unique. Esta relacao bidirecional usa @relation com nome para desambiguar: Vehicle.currentDriver e Driver.currentVehicle referenciam a mesma relacao.'));

content.push(h2('2.4 Modelo Ride'));
content.push(p('Entidade central de negocio com ciclo de vida completo de 6 estados gerenciado por maquina de estado. Armazena coordenadas de origem e destino (lat/lng), 6 timestamps de tracking (requestedAt, dispatchedAt, arrivedAt, startedAt, completedAt, canceledAt), e motivo de cancelamento. Relaciona-se com Passenger (obrigatorio), Driver (opcional, atribuido no despacho), Vehicle (opcional, atribuido no despacho) e CostCenter (opcional). Todos os relacionamentos tem indices para performance de consultas.'));

content.push(h2('2.5 Modelo AuditLog'));
content.push(p('Log de auditoria append-only que registra todas as mutacoes no sistema. Cada entrada captura userId (quem fez), action (metodo HTTP), resource (nome da entidade), resourceId (ID do registro), details (JSON stringificado com os dados da mutacao), ipAddress (extraido de x-forwarded-for ou x-real-ip), e userAgent. Nao ha update ou delete — registros sao imutaveis por design.'));

content.push(h2('2.6 Demais Modelos'));
content.push(simpleTable(
  ['Modelo', 'Proposito', 'Campos Chave', 'Relacoes'],
  [
    ['Passenger', 'Perfil de passageiro', 'userId, phone, costCenterId', 'User 1:1, CostCenter N:1, Ride 1:N'],
    ['CostCenter', 'Centro de custo departamental', 'name, code (unique), description', 'Passenger 1:N, Ride 1:N, CostCenterMetadata 1:N'],
    ['CostCenterMetadata', 'Metadados customizaveis do CC', 'key, value', 'CostCenter N:1 (cascade)'],
    ['VehicleMetadata', 'Metadados customizaveis do veiculo', 'key, value', 'Vehicle N:1 (cascade)'],
    ['AvailabilityRule', 'Regras de geofencing', 'centerLat/Lng, radiusKm, allowedDays, startTime, endTime', 'Sem relacoes (validado em codigo)'],
    ['VehicleCheckout', 'Checkout/devolucao de veiculo', 'mileageOut/In, fuelLevelOut/In, status', 'Vehicle N:1, Driver N:1'],
    ['RefreshToken', 'Tokens de refresh JWT', 'token (unique), expiresAt', 'User N:1 (cascade)'],
  ]
));

// ─── 3. Sistema de Autenticacao ───
content.push(h1('3. Sistema de Autenticacao'));
content.push(p('A autenticacao e implementada via JWT custom com dupla camada de tokens: access token de curta duracao (15 minutos) enviado no header Authorization: Bearer, e refresh token de longa duracao (7 dias) armazenado como cookie httpOnly. Esta estrategia balanceia seguranca (access token curto minimiza janela de exposicao) com experiencia do usuario (refresh token automatico sem re-login).'));

content.push(h2('3.1 auth.ts — Core de Autenticacao'));
content.push(p('Arquivo: src/lib/auth.ts (91 linhas). Este modulo centraliza toda a logica criptografica e de geracao de tokens. As constantes JWT_SECRET e JWT_REFRESH_SECRET sao exportadas como strings hardcoded — em producao, devem ser substituidas por variaveis de ambiente com valores criptograficamente fortes (32+ caracteres gerados via crypto.randomBytes).'));
content.push(simpleTable(
  ['Funcao', 'Tipo', 'Descricao Detalhada'],
  [
    ['hashPassword(password)', 'async -> string', 'Gera hash bcrypt com 10 salt rounds usando bcryptjs. O salt e gerado automaticamente. Nenhuma opcao de customizacao e exposta — 10 rounds e o padrao para平衡 entre seguranca e performance.'],
    ['comparePassword(password, hash)', 'async -> boolean', 'Compara senha em texto plano com hash bcrypt usando bcrypt.compare. Retorna true se a senha corresponder ao hash, false caso contrario. Usado exclusivamente no endpoint de login.'],
    ['generateAccessToken(user)', '-> string', 'Gera JWT com payload contendo sub (userId), email, name, role, branchId, branchName. Expira em 15 minutos (15m). Assinado com JWT_SECRET via jsonwebtoken.sign().'],
    ['generateRefreshToken()', '-> string', 'Gera UUID v4 via uuid v4() como token de refresh. Este UUID e armazenado no banco (modelo RefreshToken) e tambem definido como cookie httpOnly.'],
    ['getRefreshTokenExpiry()', '-> Date', 'Calcula data de expiracao como now + 7 dias. Usado para definir o expires do cookie e o campo expiresAt no banco.'],
    ['verifyAccessToken(token)', '-> JwtPayload', 'Verifica e decodifica JWT usando jsonwebtoken.verify() com JWT_SECRET. Dispara erro automaticamente se token estiver expirado ou invalido (propagado como 401).'],
    ['isRateLimited(email)', '-> boolean', 'Verifica se o email excedeu 5 tentativas falhas em 15 minutos. Usa Map in-memory com chaves email e valores { count, lastAttempt }. Se o tempo decorrido exceder a janela de 15 min, remove o registro e retorna false.'],
    ['recordFailedAttempt(email)', '-> void', 'Registra uma tentativa falha de login. Se o email ja existe no Map e a janela de 15 min ainda esta ativa, incrementa o contador. Caso contrario, cria novo registro com count=1.'],
    ['clearFailedAttempts(email)', '-> void', 'Remove o registro de tentativas falhas do Map ao logar com sucesso. Isso permite que o usuario faca novas tentativas apos login bem-sucedido.'],
  ]
));
content.push(p('Decisao de design: O rate limiting usa um Map in-memory em vez de Redis. Isso e aceitavel para instancias single-server (typico de Vercel/Next.js), mas em producao com multiplas instancias, recomenda-se migrar para Redis ou um store externo para que o rate limit seja compartilhado entre instancias.'));

content.push(h2('3.2 auth-middleware.ts — Middleware de Autenticacao'));
content.push(p('Arquivo: src/lib/auth-middleware.ts (37 linhas). Fornece duas funcoes e uma classe de erro usadas por todos os 26 API routes que requerem autenticacao.'));
content.push(simpleTable(
  ['Exportacao', 'Tipo', 'Uso', 'Descricao'],
  [
    ['getRequestUser(request)', 'function', 'Todos os routes protegidos', 'Extrai o header Authorization: Bearer <token>, remove o prefixo "Bearer ", chama verifyAccessToken() e retorna o JwtPayload. Dispara AuthError(401) se header ausente, nao comecar com Bearer, ou token invalido/expirado.'],
    ['requireRole(roles)', 'function factory', 'Verificacao de permissao', 'Retorna uma funcao que recebe um JwtPayload e verifica se user.role esta no array de roles permitidas. Dispara AuthError(403) se a role nao estiver permitida. Pattern: requireRole([ROLES.SUPER_ADMIN, ROLES.MANAGER])(user).'],
    ['AuthError', 'class extends Error', 'Tratamento de erros', 'Classe customizada com propriedade statusCode. Usada para diferenciar erros de autenticacao (401) de erros de permissao (403) no catch de cada route. Cada route faz instanceof AuthError para retornar o status correto.'],
  ]
));

content.push(h2('3.3 Fluxo de Login — /api/auth/login/route.ts'));
content.push(p('Arquivo: src/app/api/auth/login/route.ts (102 linhas). O endpoint POST recebe { email, password } e executa o seguinte fluxo: (1) verifica se email e password foram fornecidos (400 se nao), (2) verifica rate limiting via isRateLimited (429 se excedido), (3) busca usuario pelo email no banco (401 se nao encontrado ou inativo), (4) compara senha com hash via comparePassword (401 se invalida), (5) limpa tentativas falhas, (6) gera access token e refresh token, (7) armazena refresh token no banco (modelo RefreshToken), (8) registra auditoria, (9) retorna access token + dados do user no JSON e refresh token como cookie httpOnly. O cookie e configurado com httpOnly: true, secure: true apenas em producao (NODE_ENV === production), sameSite: lax, path: /, e expires definido pelo getRefreshTokenExpiry().'));

content.push(h2('3.4 Fluxo de Refresh — /api/auth/refresh/route.ts'));
content.push(p('O endpoint POST /api/auth/refresh nao recebe body — consome o cookie httpOnly refreshToken. Busca o token no banco (modelo RefreshToken), verifica se ainda nao expirou, revoga o token antigo (delecao), gera novo access token, cria novo refresh token no banco, e retorna o novo access token com novo cookie httpOnly. Este pattern de rotacao (revogar + recriar) previne reuse de tokens comprometidos.'));

content.push(h2('3.5 api.ts — Cliente HTTP com Auto-Refresh'));
content.push(p('Arquivo: src/lib/api.ts (151 linhas). A funcao apiFetch<T>(path, options) e o cliente HTTP usado por todo o dashboard. Implementa: (1) extracao automatica do access token do localStorage, (2) injecao do header Authorization: Bearer, (3) fetch com credentials: include (para enviar cookies httpOnly), (4) se a resposta for 401, tenta automaticamente refreshAccessToken() chamando POST /api/auth/refresh, (5) se o refresh falhar, limpa localStorage e recarrega a pagina (forca logout). O retorno e tipado como { data: T | null, error: string | null, status: number }, onde data contem o JSON completo da resposta da API (incluindo os campos success, data, pagination). Este wrapping duplo (apiResponse.data.data) e importante — os componentes acessam response.data.data para obter os dados reais.'));

// ─── 4. Maquinas de Estado ───
content.push(h1('4. Maquinas de Estado'));
content.push(p('Arquivo: src/lib/state-machine.ts (24 linhas). Implementa validacao de transicoes de status usando Maps simples. A funcao canTransition(current, target, transitions) verifica se o target esta no array de transicoes permitidas para o estado current. Se o estado current nao existir no Map ou o target nao estiver no array, retorna false — bloqueando a transicao.'));

content.push(h2('4.1 Maquina de Veiculo (VEHICLE_TRANSITIONS)'));
content.push(simpleTable(
  ['Estado Atual', 'Transicoes Permitidas', 'Contexto de Negocio'],
  [
    ['AVAILABLE', 'EN_ROUTE, OFFLINE, MAINTENANCE', 'Veiculo disponivel pode ser designado para rota, colocado offline ou mandado para manutencao'],
    ['EN_ROUTE', 'IN_RIDE, AVAILABLE', 'Veiculo a caminho pode iniciar viagem ou retornar ao disponivel (ex: passageiro cancelou)'],
    ['IN_RIDE', 'AVAILABLE', 'Apos conclusao da viagem, veiculo volta a estar disponivel'],
    ['OFFLINE', 'AVAILABLE', 'Veiculo offline so pode voltar ao estado disponivel'],
    ['MAINTENANCE', 'AVAILABLE', 'Veiculo em manutencao so pode voltar ao estado disponivel apos conclusao do servico'],
  ]
));

content.push(h2('4.2 Maquina de Viagem (RIDE_TRANSITIONS)'));
content.push(simpleTable(
  ['Estado Atual', 'Transicoes Permitidas', 'Contexto de Negocio'],
  [
    ['REQUESTED', 'DISPATCHED, CANCELED', 'Viagem recem-criada pode ser despachada para um motorista ou cancelada'],
    ['DISPATCHED', 'ARRIVED_AT_PICKUP, CANCELED', 'Apos despacho, motorista pode chegar ao ponto de retirada ou cancelar'],
    ['ARRIVED_AT_PICKUP', 'IN_PROGRESS, CANCELED', 'Motorista chegou, pode iniciar a viagem ou cancelar'],
    ['IN_PROGRESS', 'COMPLETED, CANCELED', 'Viagem em andamento pode ser concluida ou cancelada (ex: emergencia)'],
    ['COMPLETED', '(nenhum)', 'Estado terminal — viagem finalizada com sucesso'],
    ['CANCELED', '(nenhum)', 'Estado terminal — viagem cancelada'],
  ]
));
content.push(p('Decisao de design: Os estados terminais (COMPLETED, CANCELED) nao possuem transicoes de saida. Se for necessario 