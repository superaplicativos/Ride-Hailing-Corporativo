const fs = require('fs');
const path = require('path');

// This appends remaining sections to the forensic doc
// Read the existing content array from part 1

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, PageNumber, NumberFormat, AlignmentType, HeadingLevel,
  WidthType, BorderStyle, ShadingType, PageBreak, TableOfContents, SectionType,
} = require('docx');

const P = {
  bg: '162235', titleColor: 'FFFFFF', subtitleColor: 'B0B8C0',
  metaColor: '90989F', footerColor: '687078', accent: '37DCF2',
  primary: '0F172A', body: '000000', secondary: '5B6B7D',
  table: { headerBg: '1B6B7A', headerText: 'FFFFFF', accentLine: '1B6B7A', innerLine: 'C8DDE2', surface: 'EDF3F5' }
};
const c = (hex) => hex.replace('#', '');

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

function h1(t) { return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 480, after: 200 }, children: [new TextRun({ text: t, bold: true, size: 32, color: c(P.primary), font: { ascii: 'Calibri', eastAsia: 'SimHei' } })] }); }
function h2(t) { return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 360, after: 160 }, children: [new TextRun({ text: t, bold: true, size: 28, color: c(P.primary), font: { ascii: 'Calibri', eastAsia: 'SimHei' } })] }); }
function h3(t) { return new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 240, after: 120 }, children: [new TextRun({ text: t, bold: true, size: 24, color: c(P.primary), font: { ascii: 'Calibri', eastAsia: 'SimHei' } })] }); }
function p(t) { return new Paragraph({ spacing: { after: 120, line: 312 }, indent: { firstLine: 480 }, children: [new TextRun({ text: t, size: 24, color: c(P.body), font: { ascii: 'Calibri', eastAsia: 'Microsoft YaHei' } })] }); }
function headerCell(t) { return new TableCell({ shading: { type: ShadingType.CLEAR, fill: c(P.table.headerBg) }, borders: tableBorders, margins: { top: 60, bottom: 60, left: 120, right: 120 }, tableHeader: true, cantSplit: true, children: [new Paragraph({ children: [new TextRun({ text: t, bold: true, size: 21, color: c(P.table.headerText), font: { ascii: 'Calibri' } })] })] }); }
function dataCell(t, i) { return new TableCell({ shading: { type: ShadingType.CLEAR, fill: i % 2 === 0 ? c(P.table.surface) : 'FFFFFF' }, borders: tableBorders, margins: { top: 60, bottom: 60, left: 120, right: 120 }, cantSplit: true, children: [new Paragraph({ children: [new TextRun({ text: String(t || '-'), size: 21, color: c(P.body), font: { ascii: 'Calibri' } })] })] }); }
function tbl(hs, rs) { return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, layout: 'fixed', borders: tableBorders, rows: [new TableRow({ tableHeader: true, cantSplit: true, children: hs.map(h => headerCell(h)) }), ...rs.map((r, i) => new TableRow({ cantSplit: true, children: r.map(c2 => dataCell(c2, i)) }))] }); }

const content = [];

// ─── 5. Geofencing ───
content.push(h1('5. Sistema de Geofencing'));
content.push(p('Arquivo: src/lib/geofencing.ts (88 linhas). Implementa tres funcoes de validacao geografica e temporal, composadas pela funcao validateRideRequest que faz a verificacao completa. A formula de Haversine calcula a distancia entre duas coordenadas terrestres assumindo a Terra como esfera perfeita com raio de 6.371 km.'));

content.push(h2('5.1 isWithinRadius(lat1, lng1, lat2, lng2, radiusKm)'));
content.push(p('Converte latitudes e longitudes de graus para radianos, aplica a formula de Haversine para calcular a distancia ortodromica entre os dois pontos, e compara com o raio maximo permitido. A precisao e adequada para distancias ate alguns quilometros — para aplicacoes de precisao metro, seria necessario considerar o modelo WGS84 elipsoidal.'));

content.push(h2('5.2 isWithinAllowedTime(startTime, endTime)'));
content.push(p('Converte horarios no formato HH:mm para minutos desde meia-noite e verifica se o horario atual esta dentro da janela. Suporta janelas overnight (ex: 22:00-06:00) invertendo a logica de comparacao: se startMinutes > endMinutes, a verificacao passa se o horario atual e maior que o inicio OU menor que o fim.'));

content.push(h2('5.3 isAllowedDay(allowedDays)'));
content.push(p('Recebe uma string de dias separados por virgula (ex: "1,2,3,4,5" para segunda a sexta, onde 0=domingo e 6=sabado), converte para array, e verifica se o dia atual (new Date().getDay()) esta incluido. A validacao e case-sensitive — os dias devem estar no formato numerico.'));

content.push(h2('5.4 validateRideRequest(pickupLat, pickupLng, rules)'));
content.push(p('Funcao orquestradora que itera sobre todas as AvailabilityRule ativas, verificando na ordem: (1) isAllowedDay — se falhar, retorna imediatamente com motivo, (2) isWithinAllowedTime — se o horario atual estiver fora da janela, retorna com motivo, (3) isWithinRadius — se as coordenadas de pickup estiverem fora do raio, retorna com motivo. Se nenhuma regra ativa existir, retorna { valid: true } imediatamente. O pattern fail-fast garante que a primeira violacao seja reportada ao usuario sem processar regras desnecessarias.'));

// ─── 6. Auditoria ───
content.push(h1('6. Sistema de Auditoria'));
content.push(p('Arquivo: src/lib/audit.ts (26 linhas). A funcao auditLog(params) e chamada em todos os endpoints de mutacao (POST, PUT, DELETE) de todos os 12 grupos de API routes. Implementa o padrao fire-and-forget: o resultado da auditoria nao bloqueia a resposta da API — se a gravação falhar, o erro e capturado no catch e apenas logado no console, sem afetar a resposta ao cliente.'));
content.push(tbl(
  ['Parametro', 'Tipo', 'Fonte', 'Descricao'],
  [
    ['userId', 'string?', 'user.sub do JWT', 'ID do usuario autenticado que realizou a acao'],
    ['action', 'string', 'Literal do metodo HTTP', 'POST, PUT, PATCH, DELETE'],
    ['resource', 'string', 'Nome da entidade', 'Ex: users, vehicles, rides, auth/login'],
    ['resourceId', 'string?', 'ID do registro afetado', 'Null para acoes que nao afetam um registro especifico'],
    ['details', 'unknown', 'Objeto com dados da mutacao', 'Serializado como JSON.stringify — campos novos/alterados'],
    ['request', 'NextRequest', 'Objeto de request do Next.js', 'Usado para extrair IP (x-forwarded-for) e User-Agent'],
  ]
));

// ─── 7. API Routes ───
content.push(h1('7. API Routes — Analise por Grupo'));
content.push(p('Os 26 API routes seguem um pattern consistente: (1) extrair user via getRequestUser() com try/catch para AuthError, (2) verificar role via requireRole, (3) extrair query params ou body, (4) executar logica de negocio com Prisma, (5) registrar auditLog, (6) retornar resposta JSON. O tratamento de erros segue o pattern: se error instanceof AuthError, retorna { success: false, error } com o statusCode correto; caso contrario, loga e retorna 500.'));

content.push(h2('7.1 Rides — Logica Mais Complexa'));
content.push(p('O grupo de viagens tem 4 endpoints e implementa a logica de negocio mais complexa do sistema. O POST /api/rides cria uma viagem com validacao de geofencing contra todas as AvailabilityRule ativas. O POST /api/rides/[id]/dispatch e o endpoint de despacho que atribui motorista e veiculo a uma viagem, atualizando simultaneamente o status da viagem (REQUESTED -> DISPATCHED) e do veiculo (AVAILABLE -> EN_ROUTE) em uma transacao implicita do Prisma.'));

content.push(h2('7.2 Reports — Exportacao'));
content.push(p('O GET /api/reports/rides suporta tres formatos de saida: XLSX (via SheetJS), CSV (via SheetJS sheet_to_csv), e JSON (resposta direta). Os dados sao buscados com filtros de periodo, status e centro de custo, e transformados em um array de objetos com nomes de coluna amigaveis (ex: "Motor" em vez de "driver.user.name"). A geracao e server-side, permitindo exportacao de grandes volumes sem sobrecarregar o cliente.'));

content.push(h2('7.3 Padrao de Paginacao'));
content.push(p('Todos os endpoints de listagem (GET) implementam paginacao server-side identica: (1) extrair page (default 1, min 1) e limit (default 20, min 1, max 100) dos query params, (2) calcular skip = (page - 1) * limit, (3) executar findMany com skip/take em paralelo com count() para o total, (4) retornar { data: [...], pagination: { page, limit, total, totalPages } }. O limit maximo de 100 previne consultas excessivamente grandes.'));

// ─── 8. Dashboard SPA ───
content.push(h1('8. Dashboard — Single Page Application'));
content.push(p('Arquivo: src/components/dashboard/dashboard-shell.tsx (1120 linhas). O dashboard inteiro e um componente React que implementa um SPA com navegacao por estado. A variavel currentPage (string) determina qual sub-componente e renderizado dentro do area de conteudo principal. O sidebar e o topbar sao sempre visiveis. O componente inclui: DashboardShell (principal), Pagination (reutilizavel), CrudTable<T> (generico com search, paginacao, modais de criar/editar/excluir), e 10 sub-componentes de pagina (OverviewPage, UsersPage, VehiclesPage, etc.).'));

content.push(h2('8.1 CrudTable<T> — Componente Generico'));
content.push(p('O CrudTable e um componente generico TypeScript que recebe: data (array de itens), columns (definicao de colunas com chave, label e render opcional), props de search/create/edit/delete, loading state, e pagination. Cada coluna pode ter uma funcao render personalizada — usada para badges de status, formatacao de datas, e exibicao de campos aninhados. O componente renderiza automaticamente: campo de busca com debounce, cabecalho com titulo e botao de criar, tabela com linhas clicaveis para editar, e modal de exclusao com confirmacao.'));

content.push(h2('8.2 Padrão de Recarregamento'));
content.push(p('O dashboard usa um padrao de recarregamento baseado em contadores de estado (reloadKey) em vez de useCallback/useCallback. Cada pagina que precisa recarregar dados apos uma mutacao define: const [reloadKey, setReloadKey] = useState(0). Apos criar/editar/deletar, chama setReloadKey(prev => prev + 1). O useEffect que carrega os dados tem reloadKey como dependencia, causando um re-fetch automatico. Este padrao foi adotado para evitar problemas com lint do React 19 (react-hooks/exhaustive-deps) que ocorriam com o padrao useCallback + useEffect.'));

content.push(h2('8.3 Dispatch Dialog'));
content.push(p('Na pagina de viagens (RidesPage), o dialogo de despacho permite ao manager selecionar um motorista e um veiculo disponivel. Ao confirmar, chama POST /api/rides/[id]/dispatch. O dialogo busca a lista de motoristas e veiculos disponivel na abertura, filtrando por status AVAILABLE. Apos o despacho bem-sucedido, incrementa o reloadKey para recarregar a lista de viagens.'));

// ─── 9. Tracking Service ───
content.push(h1('9. Servico de Rastreamento WebSocket'));
content.push(p('Arquivo: mini-services/tracking-service/index.ts (147 linhas). Servico independente que roda na porta 3003 usando Socket.io. Nao compartilha codigo com o app Next.js — e um processo separado com seu proprio package.json. Implementa: salas (rooms) para broadcast seletivo, simulacao de posicao GPS com movimentacao aleatoria a partir do centro de Sao Paulo (-23.5505, -46.6333), e graceful shutdown via SIGTERM/SIGINT que limpa todos os intervalos ativos antes de encerrar.'));

content.push(h2('9.1 Arquitetura de Salas'));
content.push(tbl(
  ['Sala', 'Descricao', 'Emissoes Recebidas'],
  [
    ['dashboard', 'Todos os veiculos em movimento', 'vehicle-location para cada veiculo em simulacao'],
    ['ride-{rideId}', 'Veiculo de uma viagem especifica', 'vehicle-location do veiculo atribuido aquela viagem'],
  ]
));
content.push(p('Um cliente pode se inscrever em ambas as salas simultaneamente — ao fazer isso, recebe tanto as atualizacoes da frota completa quanto as da viagem especifica. A sala dashboard e tipicamente usada pela tela de visao geral do gerente, enquanto a sala ride-{id} e usada pela tela de acompanhamento de uma viagem individual.'));

content.push(h2('9.2 Simulacao de Posicao'));
content.push(p('O evento simulate-tracking inicia um setInterval que emite coordenadas a cada intervalMs (default 2000ms). A cada tick, a latitude e longitude sofrem deltas aleatorios entre -0.001 e +0.001 graus (aproximadamente +-100m), a direcao (heading) varia aleatoriamente, e a velocidade e simulada entre 20 e 60 km/h. O simulacao e por veiculo — cada veiculo tem seu proprio intervalo armazenado no Map activeSimulations. Um novo simulate-tracking para o mesmo veiculo para o intervalo anterior antes de iniciar o novo.'));

// ─── 10. Auth Store (Zustand) ───
content.push(h1('10. Estado Global — Auth Store'));
content.push(p('Arquivo: src/stores/auth-store.ts (37 linhas). O store Zustand gerencia tres fatias de estado: user (UserInfo | null), accessToken (string | null), e isAuthenticated (boolean). As acoes login e logout sincronizam o estado do store com o localStorage: login salva o token e o user como JSON; logout remove ambos. A acao setUser atualiza apenas o user (usada apos refresh de token). A verificacao typeof window !== undefined em cada acao previne erros de SSR — Next.js executa componentes no servidor durante o pre-render, onde localStorage nao existe.'));

// ─── 11. Types ───
content.push(h1('11. Sistema de Tipos'));
content.push(p('Arquivo: src/types/index.ts (91 linhas). Define todas as interfaces e constantes de tipos usados pelo sistema. JwtPayload descreve o payload do JWT com sub, email, name, role, branchId, branchName e campos opcionais iat/exp. UserInfo e a versao client-side (sem iat/exp). ApiResponse<T> e PaginatedResponse<T> definem o contrato padrao de resposta da API. As constantes ROLES, VEHICLE_STATUS e RIDE_STATUS usam as const para gerar tipos literais via typeof, garantindo que os valores usados no codigo correspondam exatamente aos definidos.'));

// ─── 12. Vericacao e Build ───
content.push(h1('12. Decisoes de Design e Consideracoes'));

content.push(h2('12.1 Por que SPA com Navegacao por Estado?'));
content.push(p('O dashboard usa navegacao por estado (currentPage) em vez de rotas Next.js por tres motivos: (1) evitar reloads de pagina inteiros ao navegar entre secoes, mantendo o sidebar e estado carregados, (2) simplificar a gerencia de autenticacao — o login e logout sao gerenciados por um unico componente shell sem necessidade de middleware de rota, (3) o reloadKey pattern e mais simples de implementar com estado local do que com router events. A desvantagem e que a URL nao muda ao navegar, dificultando deep linking e botao de voltar do navegador.'));

content.push(h2('12.2 Por que JWT Custom em Vez de NextAuth?'));
content.push(p('NextAuth adiciona complexidade significativa (configuracao de providers, adapters, callbacks, session management) que nao era necessaria para o escopo deste projeto. O JWT custom oferece controle total sobre o formato do token, o mecanismo de refresh, e a integracao com o sistema de auditoria. A desvantagem e que features como login social (Google, GitHub) exigiriam implementacao manual — mas o sistema corporativo nao requer essa funcionalidade.'));

content.push(h2('12.3 Por que SQLite em Dev?'));
content.push(p('SQLite permite que qualquer desenvolvedor clone o repositorio e rode o sistema sem configurar nenhum servico externo de banco de dados. O arquivo de banco e criado automaticamente por prisma db push no diretorio prisma/db/ (gitignored). A troca para PostgreSQL em producao requer apenas mudar o provider no schema.prisma e a DATABASE_URL — as queries Prisma sao identicas.'));

content.push(h2('12.4 Por que Socket.io em Vez de WebSocket Nativo?'));
content.push(p('Socket.io oferece: (1) salas (rooms) nativas sem implementacao manual, (2) reconexao automatica com exponential backoff, (3) fallback para long-polling se WebSocket nao estiver disponivel, (4) broadcast automatico para todas as conexoes em uma sala. O WebSocket nativo do navegador exigiria implementar todas essas funcionalidades manualmente, aumentando significativamente a complexidade.'));

content.push(h2('12.5 Por que SheetJS para Exportacao?'));
content.push(p('SheetJS (xlsx) e a unica biblioteca JavaScript que suporta geracao de arquivos XLSX server-side sem dependencias nativas (como Excel ou LibreOffice). A geracao e puramente em JavaScript, compativel com serverless (Vercel) e com qualquer runtime Node.js. Alternativas como ExcelJS oferecem mais features mas com API mais complexa; para o caso de uso simples de transformar dados tabulares em XLSX, o SheetJS e suficiente.'));

// ─── Build document ───
async function build() {
  const doc = new Document({
    styles: {
      default: { document: { run: { font: { ascii: 'Calibri', eastAsia: 'Microsoft YaHei' }, size: 24, color: c(P.body) }, paragraph: { spacing: { line: 312 } } } },
      heading1: { run: { font: { ascii: 'Calibri', eastAsia: 'SimHei' }, size: 32, bold: true, color: c(P.primary) } },
      heading2: { run: { font: { ascii: 'Calibri', eastAsia: 'SimHei' }, size: 28, bold: true, color: c(P.primary) } },
      heading3: { run: { font: { ascii: 'Calibri', eastAsia: 'SimHei' }, size: 24, bold: true, color: c(P.primary) } },
    },
    sections: [
      // Cover
      { properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 0, bottom: 0, left: 0, right: 0 } } },
        children: (function() {
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
          const meta = ['Repositorio: github.com/superaplicativos/Ride-Hailing-Corporativo', 'Stack: Next.js 16 / TypeScript / Prisma 6 / Tailwind CSS 4 / shadcn/ui', 'Data: Agosto 2025 | Versao: 1.0.0 | Confidencial'];
          for (const l of meta) children.push(new Paragraph({ indent: { left: padL + 200 }, spacing: { after: 80 }, border: { left: accentLeft },
            children: [new TextRun({ text: l, size: 22, color: c(P.metaColor), font: { ascii: 'Calibri' } })], }));
          children.push(new Paragraph({ spacing: { before: 3000 } }));
          children.push(new Paragraph({ indent: { left: padL, right: padR }, border: { top: { style: BorderStyle.SINGLE, size: 2, color: c(P.accent), space: 8 } },
            children: [new TextRun({ text: 'Super Aplicativos', size: 16, color: c(P.footerColor), font: { ascii: 'Calibri' } })] }));
          return [new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, layout: 'fixed', borders: allNoBorders, rows: [new TableRow({ height: { value: 16838, rule: 'exact' }, children: [new TableCell({ shading: { type: ShadingType.CLEAR, fill: c(P.bg) }, borders: noBorders, children: children })] })] })];
        })(),
      },
      // TOC
      { properties: { type: SectionType.NEXT_PAGE, page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 }, pageNumbers: { start: 1, formatType: NumberFormat.UPPER_ROMAN } } },
        footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '808080' })] })] }) },
        children: [
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 480, after: 360 }, children: [new TextRun({ text: 'Sumario', bold: true, size: 32, font: { eastAsia: 'SimHei', ascii: 'Calibri' } })] }),
          new TableOfContents('Table of Contents', { hyperlink: true, headingStyleRange: '1-3' }),
          new Paragraph({ spacing: { before: 200 }, children: [new TextRun({ text: 'Nota: Para atualizar os numeros de pagina, clique com o botao direito no sumario e selecione "Atualizar Campo".', italics: true, size: 18, color: '888888' })] }),
          new Paragraph({ children: [new PageBreak()] }),
        ],
      },
      // Body
      { properties: { type: SectionType.NEXT_PAGE, page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 }, pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL } } },
        headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'FleetControl — Documentacao Forense do Codigo', size: 18, color: '808080', font: { ascii: 'Calibri' } })] })] }) },
        footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '808080' })] })] }) },
        children: content,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync('/home/z/my-project/download/FleetControl-Documentacao-Forense.docx', buffer);
  console.log('Document generated successfully!');
}

build().catch(console.error);
