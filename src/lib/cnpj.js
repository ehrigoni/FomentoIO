// Utilitários de CNPJ. Suporta o formato numérico e o novo CNPJ alfanumérico
// (letras nas 12 primeiras posições, dígitos verificadores numéricos).

export const FAIXAS_FATURAMENTO = [
  'Até R$ 360.000 (Microempresa - ME)',
  'R$ 360.000 a R$ 4.800.000 (EPP)',
  'R$ 4.800.000 a R$ 16.000.000 (Médio Porte I)',
  'Acima de R$ 16.000.000 (Grande Porte)',
];

const PORTE_PARA_FAIXA = {
  'MICRO EMPRESA': 0,
  'EMPRESA DE PEQUENO PORTE': 1,
};

export const UF_REGIAO = {
  RS: 'Sul', SC: 'Sul', PR: 'Sul',
  SP: 'Sudeste', RJ: 'Sudeste', MG: 'Sudeste', ES: 'Sudeste',
  BA: 'Nordeste', SE: 'Nordeste', AL: 'Nordeste', PE: 'Nordeste', PB: 'Nordeste',
  RN: 'Nordeste', CE: 'Nordeste', PI: 'Nordeste', MA: 'Nordeste',
  GO: 'Centro-Oeste', MT: 'Centro-Oeste', MS: 'Centro-Oeste', DF: 'Centro-Oeste',
  AM: 'Norte', PA: 'Norte', AC: 'Norte', RO: 'Norte', RR: 'Norte', AP: 'Norte', TO: 'Norte',
};

export const limparCnpj = (valor) =>
  String(valor).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 14);

// 11222333000181 -> 11.222.333/0001-81 (funciona enquanto o usuário digita)
export const formatarCnpj = (valor) =>
  limparCnpj(valor)
    .replace(/^(\w{2})(\w)/, '$1.$2')
    .replace(/^(\w{2})\.(\w{3})(\w)/, '$1.$2.$3')
    .replace(/\.(\w{3})(\w)/, '.$1/$2')
    .replace(/(\w{4})(\w)/, '$1-$2');

// 6201501 -> 6201-5/01
export const formatarCnae = (codigo) => {
  const s = String(codigo).replace(/\D/g, '').padStart(7, '0');
  return `${s.slice(0, 4)}-${s.slice(4, 5)}/${s.slice(5)}`;
};

const digitoVerificador = (base) => {
  const pesos = base.length === 12
    ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const soma = pesos.reduce((acc, peso, i) => acc + (base.charCodeAt(i) - 48) * peso, 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
};

export function cnpjValido(valor) {
  const c = limparCnpj(valor);
  if (!/^[A-Z0-9]{12}\d{2}$/.test(c)) return false;
  if (/^(\d)\1{13}$/.test(c)) return false;
  const d1 = digitoVerificador(c.slice(0, 12));
  const d2 = digitoVerificador(c.slice(0, 12) + d1);
  return c.endsWith(`${d1}${d2}`);
}

export async function consultarCnpj(cnpj) {
  let resp;
  try {
    resp = await fetch(`/api/cnpj/${limparCnpj(cnpj)}`);
  } catch {
    throw new Error('Sem conexão com o serviço de consulta. Verifique a internet e tente de novo.');
  }
  if (resp.status === 404) throw new Error('CNPJ não encontrado na base da Receita Federal.');
  if (resp.status === 429) throw new Error('Muitas consultas seguidas. Aguarde alguns segundos e tente de novo.');
  if (!resp.ok) throw new Error('A consulta de CNPJ está indisponível agora. Preencha o CNAE manualmente ou tente mais tarde.');

  const d = await resp.json();
  const faixa = PORTE_PARA_FAIXA[d.porte];
  return {
    razaoSocial: d.razao_social || '',
    nomeFantasia: d.nome_fantasia || '',
    situacao: d.descricao_situacao_cadastral || '',
    municipio: d.municipio || '',
    uf: d.uf || '',
    regiao: UF_REGIAO[d.uf] || null,
    porte: d.porte || '',
    faixaFaturamento: faixa !== undefined ? FAIXAS_FATURAMENTO[faixa] : null,
    cnae: d.cnae_fiscal ? formatarCnae(d.cnae_fiscal) : '',
    cnaeDescricao: d.cnae_fiscal_descricao || '',
    cnaesSecundarios: (d.cnaes_secundarios || [])
      .filter((c) => c.codigo)
      .map((c) => ({ codigo: formatarCnae(c.codigo), descricao: c.descricao })),
    qsa: (d.qsa || [])
      .map((s) => `${s.nome_socio} (${s.qualificacao_socio})`)
      .join('; '),
  };
}
