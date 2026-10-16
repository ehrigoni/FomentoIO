import { FAIXAS_FATURAMENTO, UF_REGIAO } from './cnpj.js';

export const PORTES_CURTOS = ['ME', 'EPP', 'médio porte', 'grande porte'];

const normalizar = (t) =>
  String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// Calcula a compatibilidade entre o perfil da empresa e um edital.
// Retorna um score de 5 a 98 e a lista de motivos (positivos e de atenção).
export function avaliarEdital(edital, perfil) {
  let score = 35;
  const motivos = [];
  const ok = (texto) => motivos.push({ tipo: 'ok', texto });
  const atencao = (texto) => motivos.push({ tipo: 'atencao', texto });

  // Abrangência geográfica
  const ab = edital.abrangencia;
  if (!ab) {
    score += 15;
    ok('Abrangência nacional');
  } else if (ab.ufs) {
    if (perfil.uf && ab.ufs.includes(perfil.uf)) {
      score += 25;
      ok(`Empresa sediada em ${perfil.uf}`);
    } else if (!perfil.uf && ab.ufs.some((uf) => UF_REGIAO[uf] === perfil.regiao)) {
      score += 8;
      atencao(`Restrito a ${ab.ufs.join(', ')}. Informe o CNPJ para confirmar a UF`);
    } else {
      score -= 40;
      atencao(`Restrito a empresas de ${ab.ufs.join(', ')}`);
    }
  } else if (ab.regioes) {
    if (ab.regioes.includes(perfil.regiao)) {
      score += 20;
      ok(`Atende a região ${perfil.regiao}`);
    } else {
      score -= 40;
      atencao(`Restrito à região ${ab.regioes.join(' e ')}`);
    }
  }

  // Porte (sem faixa conhecida, como empresas acima de ME/EPP, o critério não pesa)
  const porte = FAIXAS_FATURAMENTO.indexOf(perfil.faturamentoAnual);
  if (porte !== -1) {
    if (edital.portes.includes(porte)) {
      score += 15;
      ok(`Aceita empresas ${PORTES_CURTOS[porte]}`);
    } else {
      score -= 30;
      atencao(`Voltado a ${edital.portes.map((p) => PORTES_CURTOS[p]).join(', ')}`);
    }
  }

  // Inovação / ICT
  if (edital.exigeInovacao) {
    if (perfil.isIctInovacao) {
      score += 15;
      ok('Projeto de inovação ou parceria com ICT');
    } else {
      score -= 20;
      atencao('Exige projeto de inovação ou parceria com ICT');
    }
  }

  // Regularidade fiscal
  if (edital.exigeRegularidade) {
    if (perfil.rfbRegular && perfil.pgfnRegular) {
      score += 5;
      ok('Certidões RFB/PGFN em dia');
    } else {
      score -= 25;
      atencao('Exige certidão negativa de débitos (RFB/PGFN)');
    }
  }

  // CNAE
  const cnaeHit = (perfil.cnaes || []).find((c) =>
    edital.cnaePrefixos.some((p) => c.replace(/\D/g, '').startsWith(p))
  );
  if (cnaeHit) {
    score += 10;
    ok(`CNAE ${cnaeHit} dentro do setor priorizado`);
  }

  // Palavras-chave na descrição da empresa e do CNAE
  const texto = normalizar(`${perfil.descricaoEmpresa} ${(perfil.cnaeDescricoes || []).join(' ')}`);
  const encontradas = edital.palavrasChave.filter((p) => texto.includes(normalizar(p)));
  if (encontradas.length) {
    score += Math.min(encontradas.length, 3) * 4;
    ok(`Sua descrição menciona ${encontradas.slice(0, 3).join(', ')}`);
  }

  return { ...edital, score: Math.max(5, Math.min(98, score)), motivos };
}

export function buscarEditais(editais, perfil) {
  return editais
    .map((e) => avaliarEdital(e, perfil))
    .sort((a, b) => b.score - a.score);
}
