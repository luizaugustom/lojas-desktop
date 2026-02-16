/**
 * Utilitário para carregar e buscar dados de NCM da API da Receita Federal
 */

export interface NCMItem {
  codigo: string; // 8 dígitos
  descricao: string;
  ex?: string; // Exceção da TIPI
  tipo?: string;
  vigenciaInicio?: string;
  vigenciaFim?: string;
}

interface NCMCache {
  data: NCMItem[];
  timestamp: number;
  version: string;
}

const CACHE_KEY = 'ncm_data_cache';
const CACHE_EXPIRY_DAYS = 7;
const API_URL = 'https://portalunico.siscomex.gov.br/classif/api/publico/nomenclatura/download/json';

/**
 * Lista fallback de NCMs comuns quando a API falha (CORS, rede ou indisponibilidade).
 */
const NCM_FALLBACK: NCMItem[] = [
  { codigo: '04012010', descricao: 'Leite UHT integral' },
  { codigo: '04021010', descricao: 'Leite em pó, grânulos ou outras formas sólidas' },
  { codigo: '04029100', descricao: 'Leite concentrado, não adicionado de açúcar' },
  { codigo: '04029900', descricao: 'Leite condensado e outros' },
  { codigo: '04070021', descricao: 'Ovos de galinha frescos' },
  { codigo: '07019000', descricao: 'Batatas frescas ou refrigeradas' },
  { codigo: '07031000', descricao: 'Cebolas e chalotas frescas' },
  { codigo: '07032000', descricao: 'Alhos frescos ou secos' },
  { codigo: '08051000', descricao: 'Laranjas frescas ou secas' },
  { codigo: '08052000', descricao: 'Tangerinas e clementinas frescas' },
  { codigo: '08061000', descricao: 'Uvas frescas' },
  { codigo: '08071100', descricao: 'Melancias frescas' },
  { codigo: '08071900', descricao: 'Melões frescos' },
  { codigo: '08081000', descricao: 'Maçãs frescas' },
  { codigo: '08083000', descricao: 'Pêras frescas' },
  { codigo: '08093000', descricao: 'Damasco, cereja, pêssego e ameixa frescos' },
  { codigo: '08105000', descricao: 'Framboesas, amoras e morangos frescos' },
  { codigo: '08109000', descricao: 'Outras frutas frescas' },
  { codigo: '09012100', descricao: 'Café não torrado, descafeinado' },
  { codigo: '09012200', descricao: 'Café não torrado, não descafeinado' },
  { codigo: '09021000', descricao: 'Chá verde não fermentado' },
  { codigo: '09022000', descricao: 'Outros chás não fermentados' },
  { codigo: '10019000', descricao: 'Trigo e mistura de trigo e centeio' },
  { codigo: '10063021', descricao: 'Arroz beneficiado polido' },
  { codigo: '11010010', descricao: 'Farinha de trigo' },
  { codigo: '11032000', descricao: 'Grânulos e pellets de cereais' },
  { codigo: '15079011', descricao: 'Óleo de soja refinado' },
  { codigo: '15079019', descricao: 'Outros óleos de soja' },
  { codigo: '17019900', descricao: 'Açúcar de cana' },
  { codigo: '17021100', descricao: 'Lactose e xarope de lactose' },
  { codigo: '17049020', descricao: 'Chocolate branco' },
  { codigo: '17049090', descricao: 'Outros chocolates e preparações alimentícias' },
  { codigo: '18063200', descricao: 'Chocolates em tabletes recheados' },
  { codigo: '18069000', descricao: 'Outras preparações de cacau' },
  { codigo: '19053100', descricao: 'Biscoitos e bolachas adicionados de edulcorantes' },
  { codigo: '19059090', descricao: 'Outros pães e bolos' },
  { codigo: '20079990', descricao: 'Outras geleias e purês de frutas' },
  { codigo: '20081100', descricao: 'Amendoins preparados ou conservados' },
  { codigo: '20089900', descricao: 'Outras nozes e sementes preparadas' },
  { codigo: '20091100', descricao: 'Suco de laranja congelado' },
  { codigo: '20091900', descricao: 'Suco de laranja não congelado' },
  { codigo: '20098000', descricao: 'Suco de outras frutas' },
  { codigo: '21039000', descricao: 'Outros molhos e preparações' },
  { codigo: '21069090', descricao: 'Outras preparações alimentícias' },
  { codigo: '21011100', descricao: 'Extratos de café' },
  { codigo: '21012000', descricao: 'Extratos de chá ou mate' },
  { codigo: '22011000', descricao: 'Águas minerais e gaseificadas' },
  { codigo: '22021000', descricao: 'Bebidas não alcoólicas' },
  { codigo: '22029000', descricao: 'Outras bebidas não alcoólicas' },
  { codigo: '22030000', descricao: 'Cervejas de malte' },
  { codigo: '22042100', descricao: 'Vinhos tintos em recipientes até 2 litros' },
  { codigo: '22042900', descricao: 'Outros vinhos' },
  { codigo: '22071000', descricao: 'Álcool etílico não desnaturado' },
  { codigo: '23099000', descricao: 'Outras preparações para alimentação animal' },
  { codigo: '24022000', descricao: 'Cigarros contendo tabaco' },
  { codigo: '25010019', descricao: 'Sal de mesa' },
  { codigo: '25232900', descricao: 'Cimento Portland' },
  { codigo: '27100019', descricao: 'Gasolina (exceto aviação)' },
  { codigo: '27101921', descricao: 'Óleo diesel' },
  { codigo: '27149020', descricao: 'Vaselina' },
  { codigo: '27149090', descricao: 'Outros resíduos de óleos de petróleo' },
  { codigo: '30049099', descricao: 'Outros medicamentos' },
  { codigo: '33030000', descricao: 'Perfumes e águas de toilette' },
  { codigo: '33049900', descricao: 'Outros preparados para beleza ou maquiagem' },
  { codigo: '33051000', descricao: 'Xampus' },
  { codigo: '33059000', descricao: 'Outros preparados para os cabelos' },
  { codigo: '34011100', descricao: 'Sabões de toilette' },
  { codigo: '34011900', descricao: 'Outros sabões' },
  { codigo: '34022000', descricao: 'Preparações para lavagem' },
  { codigo: '39232100', descricao: 'Sacos e bolsas de plástico' },
  { codigo: '39232900', descricao: 'Outras embalagens de plástico' },
  { codigo: '39241000', descricao: 'Mesa e artigos de mesa de plástico' },
  { codigo: '39269090', descricao: 'Outros artigos de plástico' },
  { codigo: '40169990', descricao: 'Outros artigos de borracha vulcanizada' },
  { codigo: '48191000', descricao: 'Caixas e cartonagens de papel' },
  { codigo: '48192000', descricao: 'Sacolas e bolsas de papel' },
  { codigo: '48211000', descricao: 'Etiquetas de papel' },
  { codigo: '48239000', descricao: 'Outros artigos de papel' },
  { codigo: '61091000', descricao: 'Camisetas de algodão' },
  { codigo: '61103000', descricao: 'Suéteres de malha' },
  { codigo: '62034200', descricao: 'Calças de algodão para homens' },
  { codigo: '62046200', descricao: 'Calças de algodão para mulheres' },
  { codigo: '62052000', descricao: 'Camisas de algodão para homens' },
  { codigo: '62061000', descricao: 'Camisas de seda para mulheres' },
  { codigo: '63026000', descricao: 'Roupas de cama de algodão' },
  { codigo: '63039200', descricao: 'Cortinas de algodão' },
  { codigo: '64039900', descricao: 'Outros calçados com sola de borracha' },
  { codigo: '64041100', descricao: 'Calçados esportivos' },
  { codigo: '64052000', descricao: 'Outros calçados com parte superior de couro' },
  { codigo: '65069900', descricao: 'Outros chapéus e artefatos de uso semelhante' },
  { codigo: '68109900', descricao: 'Artigos de cimento, concreto ou pedra' },
  { codigo: '69111000', descricao: 'Artigos de mesa de porcelana' },
  { codigo: '69120000', descricao: 'Artigos de cerâmica para serviço de mesa' },
  { codigo: '70133700', descricao: 'Copos de vidro' },
  { codigo: '70139900', descricao: 'Outros artigos de vidro' },
  { codigo: '72142000', descricao: 'Barras de ferro ou aço' },
  { codigo: '73181500', descricao: 'Parafusos de ferro ou aço' },
  { codigo: '73211100', descricao: 'Fogões a gás' },
  { codigo: '73218100', descricao: 'Outros aparelhos para cozinhar' },
  { codigo: '73219000', descricao: 'Partes de aparelhos de cozinha' },
  { codigo: '74199900', descricao: 'Outras obras de cobre' },
  { codigo: '76151000', descricao: 'Ferramentas de alumínio' },
  { codigo: '84143000', descricao: 'Compressores de ar' },
  { codigo: '84158100', descricao: 'Aparelhos de ar condicionado' },
  { codigo: '84182100', descricao: 'Geladeiras e freezers domésticos' },
  { codigo: '84183000', descricao: 'Congeladores horizontais' },
  { codigo: '84195000', descricao: 'Máquinas e aparelhos para condicionamento de ar' },
  { codigo: '84249000', descricao: 'Partes de pulverizadores' },
  { codigo: '84501100', descricao: 'Máquinas de lavar roupa' },
  { codigo: '84713000', descricao: 'Computadores portáteis' },
  { codigo: '84715000', descricao: 'Unidades de processamento' },
  { codigo: '84716000', descricao: 'Unidades de entrada ou saída' },
  { codigo: '84717000', descricao: 'Unidades de memória' },
  { codigo: '84718000', descricao: 'Outras unidades de máquinas automáticas' },
  { codigo: '84733000', descricao: 'Partes de máquinas de processamento de dados' },
  { codigo: '85171200', descricao: 'Aparelhos de telefonia' },
  { codigo: '85171231', descricao: 'Telefones celulares' },
  { codigo: '85171239', descricao: 'Outros aparelhos para redes de celulares' },
  { codigo: '85171800', descricao: 'Outros aparelhos de transmissão' },
  { codigo: '85176200', descricao: 'Receptores de rádio' },
  { codigo: '85182200', descricao: 'Alto-falantes montados' },
  { codigo: '85183000', descricao: 'Fones de ouvido' },
  { codigo: '85287200', descricao: 'Receptores de televisão em cores' },
  { codigo: '85366900', descricao: 'Outros conectores para tensão até 1.000 V' },
  { codigo: '85371000', descricao: 'Quadros de comando e distribuição' },
  { codigo: '85444200', descricao: 'Cabos coaxiais' },
  { codigo: '85444900', descricao: 'Outros condutores elétricos' },
  { codigo: '90049000', descricao: 'Outros óculos e artefatos semelhantes' },
  { codigo: '91011100', descricao: 'Relógios de pulso, mecanismo de quartzo' },
  { codigo: '91021100', descricao: 'Relógios de pulso, mecanismo automático' },
  { codigo: '94016100', descricao: 'Cadeiras estofadas com estrutura de madeira' },
  { codigo: '94032000', descricao: 'Móveis de metal para escritório' },
  { codigo: '94036000', descricao: 'Outros móveis de metal' },
  { codigo: '94037000', descricao: 'Móveis de madeira' },
  { codigo: '94038000', descricao: 'Móveis de plástico' },
  { codigo: '94042100', descricao: 'Colchões de borracha ou plástico' },
  { codigo: '94042900', descricao: 'Colchões de outros materiais' },
  { codigo: '95030000', descricao: 'Outros brinquedos' },
  { codigo: '96032100', descricao: 'Escovas de dentes' },
  { codigo: '96081000', descricao: 'Canetas esferográficas' },
  { codigo: '96091000', descricao: 'Lápis e pastas' },
  { codigo: '96151100', descricao: 'Pentes e travetas' },
  { codigo: '96190000', descricao: 'Fraldas e artigos de higiene' },
  { codigo: '99999999', descricao: 'Outros produtos (genérico)' },
];

/**
 * Verifica se o cache está válido
 */
function isCacheValid(cache: NCMCache | null): boolean {
  if (!cache) return false;
  
  const now = Date.now();
  const expiryTime = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000; // 7 dias em ms
  const isValid = (now - cache.timestamp) < expiryTime;
  
  return isValid;
}

/**
 * Carrega dados do cache
 */
function loadFromCache(): NCMCache | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const cache: NCMCache = JSON.parse(cached);
    return isCacheValid(cache) ? cache : null;
  } catch (error) {
    console.error('Erro ao carregar cache de NCM:', error);
    return null;
  }
}

/**
 * Salva dados no cache
 */
function saveToCache(data: NCMItem[]): void {
  try {
    const cache: NCMCache = {
      data,
      timestamp: Date.now(),
      version: '1.0',
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Erro ao salvar cache de NCM:', error);
    // Se o localStorage estiver cheio, tenta limpar cache antigo
    try {
      localStorage.removeItem(CACHE_KEY);
      const cache: NCMCache = {
        data,
        timestamp: Date.now(),
        version: '1.0',
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
      console.error('Erro ao limpar e recriar cache:', e);
    }
  }
}

/**
 * Normaliza dados da API para o formato esperado.
 * API Siscomex retorna: { Nomenclaturas: [{ Codigo, Descricao, ... }] } ou array direto.
 */
function normalizeAPIData(apiData: any[]): NCMItem[] {
  if (!Array.isArray(apiData)) {
    return [];
  }

  const normalized: Array<NCMItem | null> = apiData.map((item: any): NCMItem | null => {
    // API Siscomex usa Codigo/Descricao (maiúscula); aceita também camelCase
    const codigo = item.Codigo ?? item.codigo ?? item.code ?? '';
    const descricao = item.Descricao ?? item.descricao ?? item.description ?? '';
    
    // Remove pontos do código (ex: "0101.21.00" -> "01012100") e normaliza para 8 dígitos
    const codigoLimp = String(codigo).replace(/\./g, '').replace(/\D/g, '');
    const normalizedCode = codigoLimp.padStart(8, '0').slice(0, 8);
    
    if (!normalizedCode || normalizedCode.length !== 8) return null;
    if (normalizedCode === '00000000' && !String(descricao).trim()) return null;

    return {
      codigo: normalizedCode,
      descricao: String(descricao).trim() || '(Sem descrição)',
      ex: item.Ex ?? item.ex ?? item.exception,
      tipo: item.Tipo ?? item.tipo ?? item.type,
      vigenciaInicio: item.VigenciaInicio ?? item.vigenciaInicio,
      vigenciaFim: item.VigenciaFim ?? item.vigenciaFim,
    };
  });

  return normalized.filter((item): item is NCMItem => item !== null);
}

/**
 * Carrega dados de NCM.
 * Prioridade: backend (evita CORS) > cache > API direta > fallback.
 *
 * @param forceRefresh - se true, ignora cache e tenta buscar de novo
 * @param fetchFromBackend - função que chama o endpoint GET /ncm do backend (recomendado para evitar CORS)
 */
export async function loadNCMData(
  forceRefresh = false,
  fetchFromBackend?: () => Promise<NCMItem[]>,
): Promise<NCMItem[]> {
  if (!forceRefresh) {
    const cached = loadFromCache();
    if (cached && cached.data.length > 0) {
      return cached.data;
    }
  }

  if (fetchFromBackend) {
    try {
      const data = await fetchFromBackend();
      if (data && Array.isArray(data) && data.length > 0) {
        const normalized = normalizeAPIData(data);
        if (normalized.length > 0) {
          saveToCache(normalized);
          return normalized;
        }
      }
    } catch (err) {
      console.warn('Erro ao carregar NCM pelo backend:', err);
    }
  }

  try {
    const response = await fetch(API_URL, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Erro ao buscar dados: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (data.code || data.message) {
      throw new Error(data.message || 'Erro desconhecido da API');
    }

    // API Siscomex retorna { Nomenclaturas: [...] }; aceita também array direto
    const rawItems = Array.isArray(data)
      ? data
      : Array.isArray(data?.Nomenclaturas)
        ? data.Nomenclaturas
        : [data];
    const normalizedData = normalizeAPIData(rawItems);
    if (normalizedData.length === 0) {
      const cached = loadFromCache();
      if (cached && cached.data.length > 0) return cached.data;
      throw new Error('Nenhum dado NCM encontrado na resposta da API');
    }

    saveToCache(normalizedData);
    return normalizedData;
  } catch (error) {
    console.error('Erro ao carregar dados NCM da API:', error);
    const cached = loadFromCache();
    if (cached && cached.data.length > 0) {
      console.warn('Usando cache expirado devido a erro na API');
      return cached.data;
    }
    console.warn('API NCM indisponível. Usando lista de códigos mais usados.');
    return NCM_FALLBACK;
  }
}

/**
 * Busca NCMs por código ou descrição
 */
export function searchNCM(query: string, data: NCMItem[]): NCMItem[] {
  if (!query || query.trim().length === 0) {
    return data.slice(0, 100); // Limitar resultados iniciais
  }

  const searchTerm = query.trim().toLowerCase();
  const isNumericSearch = /^\d+$/.test(searchTerm);

  const results = data.filter((item) => {
    // Busca por código (exata ou parcial)
    if (isNumericSearch) {
      const codeMatch = item.codigo.includes(searchTerm);
      if (codeMatch) return true;
    }

    // Busca por descrição (case-insensitive)
    const descMatch = item.descricao.toLowerCase().includes(searchTerm);
    return descMatch;
  });

  // Ordenar resultados: códigos exatos primeiro, depois parciais, depois descrições
  return results.sort((a, b) => {
    const aCode = a.codigo.toLowerCase();
    const bCode = b.codigo.toLowerCase();
    
    // Código exato primeiro
    if (aCode === searchTerm && bCode !== searchTerm) return -1;
    if (bCode === searchTerm && aCode !== searchTerm) return 1;
    
    // Códigos que começam com o termo
    if (aCode.startsWith(searchTerm) && !bCode.startsWith(searchTerm)) return -1;
    if (bCode.startsWith(searchTerm) && !aCode.startsWith(searchTerm)) return 1;
    
    // Ordenar por código
    return aCode.localeCompare(bCode);
  });
}

/**
 * Retorna um NCM específico por código
 */
export function getNCMByCode(code: string, data: NCMItem[]): NCMItem | undefined {
  const normalizedCode = code.toString().padStart(8, '0').slice(0, 8);
  return data.find((item) => item.codigo === normalizedCode);
}

/**
 * Limpa o cache de NCM
 */
export function clearNCMCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.error('Erro ao limpar cache de NCM:', error);
  }
}

/**
 * Obtém informações do cache (útil para debug)
 */
export function getCacheInfo(): { exists: boolean; isValid: boolean; itemCount: number; age: number } {
  const cache = loadFromCache();
  if (!cache) {
    return { exists: false, isValid: false, itemCount: 0, age: 0 };
  }

  const now = Date.now();
  const age = now - cache.timestamp;
  const isValid = isCacheValid(cache);

  return {
    exists: true,
    isValid,
    itemCount: cache.data.length,
    age: Math.floor(age / (1000 * 60 * 60)), // Idade em horas
  };
}
