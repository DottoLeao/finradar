/**
 * Amostras PT-BR sintéticas pro treino do classificador
 * (scripts/train-category-classifier.ts). O dataset da Hugging Face é 100%
 * inglês/EUA — sem isto o classificador só generaliza pro português por
 * sorte do embedding multilíngue.
 *
 * Geradas por template (comerciante × cidade × formato de extrato), estilo
 * de linha de extrato BR real: caixa alta, sem acento na maioria, sufixo
 * "BRA" à la bandeira de cartão.
 *
 * IMPORTANTE: os comerciantes daqui NÃO podem aparecer no PT_SANITY_SET do
 * script de treino — aquele conjunto é held-out de propósito (ex.: "MERCADO
 * DA VILA" e "PADARIA BOM GOSTO" ficam fora daqui).
 */
import type { Category } from "@/lib/categorize/rules";

export interface PtSample {
  description: string;
  category: Category;
}

const CITIES = [
  "SAO PAULO",
  "CURITIBA",
  "RIO DE JANEIRO",
  "BELO HORIZONTE",
  "PORTO ALEGRE",
  "RECIFE",
  "FLORIANOPOLIS",
  "CAMPINAS",
  "SALVADOR",
  "GOIANIA",
];

const PEOPLE = ["JOAO PEREIRA", "MARIA SILVA", "CARLOS SOUZA", "ANA COSTA", "PEDRO SANTOS", "JULIA OLIVEIRA"];

const COMPANIES = ["TECNORTE LTDA", "COMERCIAL ANDRADE SA", "AGROSUL SA", "LOGISTICA PRIME LTDA", "ESTUDIO CRIATIVO ME"];

/** Comerciante × cidade, nos formatos de linha de cartão mais comuns. */
function cardLines(merchants: string[], category: Category): PtSample[] {
  const samples: PtSample[] = [];
  merchants.forEach((merchant, i) => {
    for (const city of CITIES) {
      samples.push({ description: `${merchant} ${city} BRA`, category });
    }
    // Variantes de formato só em cidades alternadas, pra não explodir o total
    const city = CITIES[i % CITIES.length];
    samples.push({ description: `COMPRA CARTAO ${merchant} ${city}`, category });
    samples.push({ description: `DEB AUT ${merchant}`, category });
  });
  return samples;
}

function fill(templates: string[], values: string[], category: Category): PtSample[] {
  return templates.flatMap((template) =>
    values.map((value) => ({ description: template.replace("{}", value), category }))
  );
}

const DINING_MERCHANTS = [
  "IFOOD *IFD RESTAURANTES",
  "RAPPI *LANCHES",
  "RESTAURANTE SABOR CASEIRO",
  "PIZZARIA FORNO A LENHA",
  "LANCHONETE DO ZE",
  "PADARIA PONTO QUENTE",
  "CHURRASCARIA GAUCHA",
  "BAR DO JUCA",
  "CAFETERIA GRAO ESPECIAL",
  "SUSHI YAMA",
  "HAMBURGUERIA REX",
  "PASTELARIA CENTRAL",
];

const GROCERIES_MERCHANTS = [
  "CARREFOUR",
  "PAO DE ACUCAR",
  "ASSAI ATACADISTA",
  "ATACADAO",
  "SUPERMERCADO EXTRA",
  "ZAFFARI",
  "SONDA SUPERMERCADOS",
  "MERCADINHO SAO JORGE",
  "MERCADO MUNICIPAL",
  "HORTIFRUTI NATURAL",
  "ACOUGUE BOI FELIZ",
  "EMPORIO SANTA LUZIA",
];

const TRANSPORT_MERCHANTS = [
  "UBER *TRIP",
  "99APP *99APP",
  "POSTO IPIRANGA",
  "POSTO SHELL",
  "ESTACIONAMENTO SHOPPING",
  "METRO SP",
  "BILHETE UNICO RECARGA",
  "PEDAGIO SEM PARAR",
  "LOCADORA MOVIDA",
  "ONIBUS EXPRESSO BRASILEIRO",
];

const SUBSCRIPTION_MERCHANTS = [
  "NETFLIX.COM",
  "SPOTIFY",
  "GLOBOPLAY",
  "AMAZON PRIME",
  "YOUTUBE PREMIUM",
  "DEEZER",
  "PARAMOUNT PLUS",
  "HBO MAX",
  "SMARTFIT MENSALIDADE",
  "ASSINATURA UOL",
];

const HEALTHCARE_MERCHANTS = [
  "DROGASIL",
  "DROGA RAIA",
  "FARMACIAS PAGUE MENOS",
  "FARMACIA SAO JOAO",
  "DROGARIA PACHECO",
  "ULTRAFARMA",
  "CLINICA VIDA PLENA",
  "LABORATORIO FLEURY",
  "HOSPITAL SANTA HELENA",
  "ODONTO COMPANY",
];

export const PT_TRAINING_SAMPLES: PtSample[] = [
  ...cardLines(DINING_MERCHANTS, "dining"),
  ...cardLines(GROCERIES_MERCHANTS, "groceries"),
  ...cardLines(TRANSPORT_MERCHANTS, "transport"),
  ...cardLines(SUBSCRIPTION_MERCHANTS, "subscriptions"),
  ...cardLines(HEALTHCARE_MERCHANTS, "healthcare"),

  ...fill(
    [
      "PIX ENVIADO {}",
      "PIX RECEBIDO {}",
      "TRANSFERENCIA ENVIADA PELO PIX {}",
      "TRANSFERENCIA RECEBIDA PELO PIX {}",
      "TED RECEBIDA {}",
      "TED ENVIADA {}",
      "DOC ENVIADO {}",
      "ENVIO PIX {}",
      "CREDITO PIX {}",
      "TRANSF ENTRE CONTAS {}",
    ],
    PEOPLE,
    "transfer"
  ),
  ...fill(["PAGAMENTO BOLETO {}", "PAGTO BOLETO {}", "BOLETO {}"], COMPANIES, "transfer"),

  ...fill(
    [
      "PAGAMENTO ALUGUEL IMOBILIARIA {}",
      "ALUGUEL REF MES IMOB {}",
      "PIX ALUGUEL {}",
      "PAGTO ALUGUEL APTO {}",
      "DEB AUT CONDOMINIO E ALUGUEL {}",
    ],
    ["HORIZONTE", "PLANALTO", "MORADA NOVA", "BELA VISTA", "PRIMAVERA", "CENTRAL"],
    "rent"
  ),

  ...fill(
    [
      "SALARIO {}",
      "CREDITO SALARIO {}",
      "PAGAMENTO FOLHA {}",
      "REMUNERACAO {}",
      "PROVENTOS {}",
      "CREDITO DE SALARIO REF MES {}",
      "PAGTO SALARIO {}",
      "ADIANTAMENTO SALARIAL {}",
    ],
    COMPANIES,
    "income"
  ),
];
