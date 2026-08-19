const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Header, Footer,
  AlignmentType, HeadingLevel, PageNumber, PageBreak,
  TableOfContents, SectionType, Table, TableRow, TableCell,
  WidthType, BorderStyle, ShadingType
} = require("docx");

// === Palette: Warm + Medium + Calm (Consulting) ===
const P = {
  bg: "#1E1B18",
  titleColor: "#F5F0EB",
  subtitleColor: "#C4B8A8",
  metaColor: "#A89880",
  accent: "#D4A050",
  footerColor: "#887860",
  primary: "#241E1A",
  body: "#3A3430",
  secondary: "#68605A",
  surface: "#FDFBF9"
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

// === COVER R4 (Top Color Block) ===
function buildCoverR4(config) {
  const padL = 1400, padR = 1000;
  const availableWidth = 11906 - padL - padR;
  const titlePt = 38;
  const titleSize = titlePt * 2;
  const titleLines = ["FleetControl", "Plataforma de Gestao de Frota", "e Transporte Corporativo"];

  const children = [];

  // Top color block area with title
  const blockChildren = [];
  blockChildren.push(new Paragraph({ spacing: { before: 2400 } }));
  blockChildren.push(new Paragraph({
    indent: { left: padL, right: padR },
    spacing: { after: 200 },
    children: [new TextRun({
      text: "PROPOSTA DE SOLUCAO",
      size: 20, color: c(P.accent), font: { ascii: "Calibri" }, characterSpacing: 60,
    })],
  }));

  for (let i = 0; i < titleLines.length; i++) {
    blockChildren.push(new Paragraph({
      indent: { left: padL },
      spacing: { after: i < titleLines.length - 1 ? 80 : 200, line: Math.ceil(titlePt * 23), lineRule: "atLeast" },
      children: [new TextRun({ text: titleLines[i], size: titleSize, bold: true,
        color: "#FFFFFF", font: { ascii: "Arial", eastAsia: "SimHei" } })],
    }));
  }

  blockChildren.push(new Paragraph({
    indent: { left: padL }, spacing: { after: 100 },
    children: [new TextRun({ text: config.subtitle || "", size: 26, color: "#D0D0D0",
      font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })],
  }));

  blockChildren.push(new Paragraph({ spacing: { before: 2800 } }));

  // Meta info at bottom of block
  for (const line of (config.metaLines || [])) {
    blockChildren.push(new Paragraph({
      indent: { left: padL }, spacing: { after: 60 },
      children: [new TextRun({ text: line, size: 20, color: "#A0A0A0",
        font: { ascii: "Calibri" } })],
    }));
  }

  // Footer line
  blockChildren.push(new Paragraph({
    indent: { left: padL, right: padR },
    border: { top: { style: BorderStyle.SINGLE, size: 2, color: c(P.accent), space: 8 } },
    spacing: { before: 400 },
    children: [
      new TextRun({ text: config.footerLeft || "", size: 16, color: "#888888", font: { ascii: "Calibri" } }),
      new TextRun({ text: "                                                    " }),
      new TextRun({ text: config.footerRight || "", size: 16, color: "#888888", font: { ascii: "Calibri" } }),
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
        children: blockChildren,
      })],
    })],
  })];
}

// === BODY CONTENT ===
const coverConfig = {
  title: "FleetControl",
  subtitle: "Sistema completo para gestao de frota, controle de viagens e otimizacao de transporte corporativo",
  metaLines: [
    "Versao 1.0 | Agosto 2026",
    "Super Aplicativos",
    "Documento Confidencial",
  ],
  footerLeft: "Super Aplicativos",
  footerRight: "Confidencial",
};

const bodyContent = [
  // ===== 1. RESUMO EXECUTIVO =====
  h1("1. Resumo Executivo"),
  body("O FleetControl e uma plataforma completa de gestao de frota e transporte corporativo, desenvolvida para atender as necessidades de empresas que precisam gerenciar seus veiculos, motoristas e viagens de forma centralizada e eficiente. A solucao foi projetada para oferecer controle total sobre a operacao, desde a solicitacao de viagens ate a geracao de relatorios gerenciais, passando pelo rastreamento em tempo real e a auditoria completa de todas as acoes realizadas no sistema."),
  body("A plataforma se destaca pela simplicidade de uso, com uma interface web moderna e intuitiva acessivel por qualquer navegador, sem necessidade de instalacao de software adicional. O sistema suporta multiplas funcoes de usuario, permitindo que administradores, gerentes, motoristas e passageiros interajam com a plataforma de acordo com suas respectivas permissoes. Alem disso, a solucao esta preparada para crescer junto com a empresa, com uma arquitetura escalavel que suporta a expansao para novas unidades e demandas operacionais."),

  // ===== 2. SOBRE O SISTEMA =====
  h1("2. Sobre o Sistema"),

  h2("2.1 Objetivo"),
  body("O objetivo principal do FleetControl e centralizar a gestao de toda a operacao de transporte corporativo em uma unica plataforma. Isso inclui o cadastro e acompanhamento de veiculos, gestao de motoristas com controle de habilitacoes, solicitacao e acompanhamento de viagens por passageiros, alocacao inteligente de recursos, controle de custos por centro de custo e geracao de relatorios detalhados para tomada de decisao."),
  body("A plataforma elimina a necessidade de planilhas, processos manuais e comunicacao fragmentada, substituindo-os por um fluxo de trabalho digital integrado. Todas as informacoes ficam centralizadas e acessiveis em tempo real, permitindo visibilidade completa da operacao para gestores e administradores."),

  h2("2.2 Principios de Design"),
  body("O sistema foi projetado seguindo principios modernos de desenvolvimento de software, priorizando a experiencia do usuario, a seguranca das informacoes e a confiabilidade da operacao. A interface foi construida com componentes acessiveis e responsivos, garantindo usabilidade em diferentes dispositivos e tamanhos de tela. A arquitetura modular permite que novos modulos e funcionalidades sejam adicionados sem impactar as partes existentes do sistema."),
  body("A seguranca e tratada como requisito fundamental, com autenticacao segura, controle de acesso baseado em funcoes, criptografia de senhas e registro completo de auditoria. Todas as acoes realizadas no sistema sao rastreaveis, garantindo conformidade com regulamentacoes internas e externas."),

  // ===== 3. FUNCIONALIDADES PRINCIPAIS =====
  h1("3. Funcionalidades Principais"),
  body("O FleetControl oferece um conjunto abrangente de funcionalidades que cobrem todo o ciclo de vida da operacao de transporte corporativo. As funcionalidades foram organizadas em modulos integrados que comunicam entre si de forma transparente, proporcionando uma experiencia fluida tanto para operadores quanto para gestores."),

  h2("3.1 Gestao de Usuarios"),
  body("O modulo de gestao de usuarios permite o cadastro e administracao completa de todos os participantes do sistema. Cada usuario possui um perfil com informacoes pessoais e uma funcao especifica que determina seu nivel de acesso e as funcionalidades disponiveis. O sistema suporta quatro perfis de usuario, cada um com permissoes adequadas a sua responsabilidade na operacao."),
  simpleTable(
    ["Perfil", "Descricao", "Acesso Principal"],
    [
      ["Administrador", "Gestor total do sistema", "Configuracoes, usuarios, relatorios, auditoria"],
      ["Gerente", "Supervisor da operacao diaria", "Viagens, frota, motoristas, relatorios"],
      ["Motorista", "Operador do veiculo", "Viagens atribuidas, checkout de veiculo"],
      ["Passageiro", "Solicitante de transporte", "Solicitacao de viagens, historico"],
    ]
  ),
  body(""),

  h2("3.2 Controle de Viagens"),
  body("O modulo de viagens e o nucleo operacional do sistema, gerenciando todo o fluxo desde a solicitacao ate a conclusao. O passageiro solicita uma viagem informando origem, destino e horario desejado. O sistema valida a solicitacao conforme as regras configuradas e a aloca para um motorista disponivel. A viagem acompanha seu status em tempo real, passando por etapas de confirmacao, inicio, andamento e conclusao."),
  body("O sistema mantem um historico completo de todas as viagens realizadas, incluindo detalhes como motorista responsavel, veiculo utilizado, centro de custo, distancia percorrida e duracao. Este historico alimenta os relatorios gerenciais e permite analises de eficiencia operacional."),

  h2("3.3 Rastreamento em Tempo Real"),
  body("Para viagens em andamento, o sistema oferece a capacidade de rastreamento em tempo real, permitindo que gestores acompanhem a posicao dos veiculos e o progresso das viagens diretamente no painel de controle. Esta funcionalidade utiliza tecnologia de comunicacao bidirecional que atualiza a posicao automaticamente, sem necessidade de recarregar a pagina."),

  // ===== 4. GESTAO DE FROTA =====
  h1("4. Gestao de Frota"),
  body("O modulo de gestao de frota proporciona visibilidade completa sobre todos os veiculos da empresa, permitindo o controle de seu ciclo de vida, manutencao, disponibilidade e alocacao. Cada veiculo possui um cadastro detalhado com informacoes tecnicas, documentacao e metadados adicionais como datas de vencimento de IPVA e seguro."),

  h2("4.1 Ciclo de Vida do Veiculo"),
  body("Cada veiculo no sistema possui um status que reflete sua situacao atual na operacao. O sistema controla automaticamente as transicoes validas entre os seguintes estados: Disponivel, Em Uso, Em Manutencao, Fora de Servico e Aposentado. Essa maquina de estados garante que mudancas invalidas de status nao ocorram, como, por exemplo, marcar um veiculo como disponivel enquanto esta em uso por um motorista."),
  body("A alocacao de veiculos a motoristas e feita atraves de um processo de checkout formal, que registra o momento em que o motorista assume a responsabilidade pelo veiculo e o momento da devolucao. Esse processo gera registros de auditoria completos, essenciais para controle patrimonial e responsabilidade civil."),

  h2("4.2 Regras de Disponibilidade"),
  body("O sistema permite configurar regras de disponibilidade por veiculo, definindo horarios de funcionamento, dias da semana permitidos e limites geograficos (geofencing). Essas regras sao aplicadas automaticamente no momento da solicitacao de viagens, garantindo que os recursos sejam utilizados dentro dos parametros definidos pela gestao."),
  body("O geofencing permite delimitar areas geograficas de operacao, calculando automaticamente se a origem e o destino de uma viagem estao dentro da area permitida. Quando uma solicitacao esta fora dos limites configurados, o sistema notifica o usuario com uma mensagem clara, evitando desvios operacionais."),

  // ===== 5. RELATORIOS E ANALISES =====
  h1("5. Relatorios e Analises"),
  body("O modulo de relatorios oferece ferramentas poderosas para analise da operacao de transporte. Os relatorios podem ser gerados em formato de planilha eletronica, permitindo que os gestores trabalhem com os dados em ferramentas como Excel e Google Sheets. Os filtros disponiveis incluem periodo, status da viagem, centro de custo e motorista, proporcionando flexibilidade para diferentes niveis de analise."),

  h2("5.1 Tipos de Relatorio"),
  body("O relatorio principal de viagens apresenta dados detalhados de cada viagem realizada no periodo selecionado, incluindo informacoes do passageiro, motorista, veiculo, centros de custo, horarios de inicio e fim, e status final. Os dados podem ser exportados nos formatos XLSX e CSV, atendendo tanto a analises avancadas em planilhas quanto a integracoes com outros sistemas da empresa."),
  body("Alem dos relatorios detalhados, o painel principal (dashboard) apresenta um resumo visual com os principais indicadores operacionais: quantidade de usuarios ativos, veiculos disponiveis, viagens do mes e motoristas em atividade. Esses indicadores sao atualizados automaticamente e proporcionam uma visao instantanea da saude operacional do sistema."),

  h2("5.2 Auditoria e Conformidade"),
  body("Todas as acoes realizadas no sistema sao registradas em um log de auditoria imutavel. Isso significa que qualquer criacao, alteracao ou exclusao de dados fica armazenada com informacoes sobre quem realizou a acao, quando foi realizada e quais foram os valores antes e depois da modificacao. Esse nivel de rastreabilidade e essencial para conformidade regulatoria, investigacoes internas e resolucao de disputas."),
  body("Os registros de auditoria podem ser consultados e filtrados por usuario, tipo de acao e entidade afetada, facilitando a verificacao de atividades suspeitas ou a compilacao de relatorios de conformidade para auditorias externas."),

  // ===== 6. SEGURANCA =====
  h1("6. Seguranca e Controle de Acesso"),
  body("A seguranca e um pilar fundamental da plataforma, implementada em multiplas camadas para proteger os dados e garantir que apenas usuarios autorizados tenham acesso as funcionalidades e informacoes adequadas ao seu perfil."),

  h2("6.1 Autenticacao"),
  body("O sistema utiliza um mecanismo de autenticacao robusto baseado em tokens seguros com validade limitada. As senhas dos usuarios sao armazenadas de forma criptografada, utilizando algoritmos de hash com salt, garantindo que mesmo em caso de acesso indevido ao banco de dados, as senhas originais nao possam ser recuperadas. O sistema inclui protecao contra ataques de forca bruta, limitando o numero de tentativas de login em um determinado periodo."),

  h2("6.2 Controle de Acesso por Funcao"),
  body("Cada usuario do sistema possui uma funcao que define exatamente quais funcionalidades ele pode acessar. O controle de acesso e aplicado tanto na interface do usuario, ocultando opcoes nao disponiveis, quanto no servidor, rejeitando requisicoes nao autorizadas. Essa dupla verificacao garante que a seguranca nao dependa exclusivamente da interface."),

  // ===== 7. INFRAESTRUTURA =====
  h1("7. Requisitos e Infraestrutura"),
  body("A solucao foi projetada para operar em ambiente de nuvem, com deploy simplificado e escalabilidade integrada. A infraestrutura recomendada para producao utiliza servicos gerenciados que eliminam a necessidade de manutencao de servidores dedicados, reduzindo custos operacionais e complexidade tecnica."),

  h2("7.1 Requisitos de Infraestrutura"),
  simpleTable(
    ["Recurso", "Recomendacao", "Observacao"],
    [
      ["Hospedagem", "Plataforma cloud com suporte a Node.js", "Ambiente gerenciado com deploy automatico"],
      ["Banco de Dados", "Banco de dados relacional gerenciado", "PostgreSQL recomendado para producao"],
      ["Dominio", "Dominio personalizado (opcional)", "Pode ser configurado apos o deploy inicial"],
      ["SSL", "Certificado SSL automatico", "Incluido na maioria das plataformas cloud"],
    ]
  ),
  body(""),

  h2("7.2 Escalabilidade"),
  body("A arquitetura do sistema foi projetada para crescer de forma orgânica com a demanda da empresa. Novos modulos podem ser adicionados conforme necessidade, e a infraestrutura de banco de dados suporta volumes significativos de dados e transacoes simultaneas. O servico de rastreamento em tempo real opera de forma independente, permitindo escalar essa funcionalidade separadamente do resto da aplicacao caso necessario."),

  // ===== 8. PROXIMOS PASSOS =====
  h1("8. Proximos Passos"),
  body("Para dar continuidade ao projeto, recomendamos as seguintes etapas, que podem ser adaptadas conforme as prioridades e o cronograma da equipe:"),
  bullet("Definicao do ambiente de producao: selecao e configuracao da infraestrutura cloud e do banco de dados gerenciado."),
  bullet("Integracao com sistemas existentes: conexao com ERPs, sistemas de RH e plataformas de gestao patrimonial da empresa."),
  bullet("Personalizacao de regras de negocio: ajuste das regras de geofencing, horarios e centros de custo conforme as politicas internas."),
  bullet("Homologacao: testes com usuarios reais em ambiente controlado para validacao dos fluxos operacionais."),
  bullet("Treinamento: capacitacao dos usuarios finais em cada perfil (administradores, gerentes, motoristas e passageiros)."),
  bullet("Monitoramento: configuracao de alertas e dashboards para acompanhamento da saude do sistema em producao."),
  bullet("Expansao: avaliacao de novos modulos como gestao de combustivel, manutencao preventiva e integracao com aplicativos mobile."),
  body(""),
  body("A equipe tecnica responsavel pela manutencao podera contar com documentacao detalhada da arquitetura e dos modulos do sistema para dar continuidade ao desenvolvimento e realizar customizacoes conforme as necessidades especificas da operacao."),
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
      children: buildCoverR4(coverConfig),
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
          headingStyleRange: "1-2",
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
            children: [new TextRun({ text: "FleetControl - Proposta de Solucao", size: 18, color: "808080", font: { ascii: "Calibri" } })],
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
const OUTPUT = "/home/z/my-project/download/FleetControl-Proposta-Cliente.docx";
Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(OUTPUT, buf);
  console.log("Client doc generated:", OUTPUT);
});