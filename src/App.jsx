import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  Building2,
  CalendarClock,
  CheckCircle2,
  Landmark,
  Loader2,
  Search,
  ShieldCheck,
  Sprout,
  Wallet,
} from 'lucide-react';
import {
  FAIXAS_FATURAMENTO,
  cnpjValido,
  consultarCnpj,
  formatarCnpj,
  limparCnpj,
} from './lib/cnpj.js';
import { buscarEditais } from './lib/match.js';
import { EDITAIS_DEMO } from './data/editais.js';

const REGIOES = [
  { valor: 'Brasil', rotulo: 'Nacional (todo o Brasil)' },
  { valor: 'Sul', rotulo: 'Sul' },
  { valor: 'Sudeste', rotulo: 'Sudeste' },
  { valor: 'Nordeste', rotulo: 'Nordeste' },
  { valor: 'Centro-Oeste', rotulo: 'Centro-Oeste' },
  { valor: 'Norte', rotulo: 'Norte' },
];

const FONTES = [
  { id: 'pncp', nome: 'PNCP', detalhe: 'Portal Nacional de Contratações Públicas' },
  { id: 'transparencia', nome: 'Portal da Transparência', detalhe: 'Consulta ao CEIS e CNEP' },
  { id: 'serpro', nome: 'Serpro', detalhe: 'Situação fiscal e certidões' },
  { id: 'saas', nome: 'Plataformas de editais', detalhe: 'Agregadores privados' },
];

const campo =
  'w-full rounded-md border border-line bg-surface px-3 py-2.5 text-[15px] text-ink placeholder:text-muted/70 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25';

function Rotulo({ htmlFor, children, dica }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-ink">
      {children}
      {dica && <span className="ml-1.5 font-normal text-muted">{dica}</span>}
    </label>
  );
}

function Marcador({ name, checked, onChange, titulo, descricao }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-md border border-line bg-surface p-3 transition hover:border-brand/60 has-[:checked]:border-brand has-[:checked]:bg-brand-soft">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
        className="mt-0.5 size-4 shrink-0 accent-[var(--brand)]"
      />
      <span>
        <span className="block text-sm font-semibold">{titulo}</span>
        {descricao && <span className="block text-[13px] text-muted">{descricao}</span>}
      </span>
    </label>
  );
}

function SeloCompatibilidade({ valor }) {
  const cor = valor >= 80 ? 'var(--brand)' : valor >= 55 ? 'var(--sun)' : 'var(--muted)';
  return (
    <div
      role="img"
      aria-label={`Compatibilidade de ${valor}%`}
      className="grid size-[72px] shrink-0 place-items-center rounded-full"
      style={{ background: `conic-gradient(${cor} ${valor * 3.6}deg, var(--line) 0deg)` }}
    >
      <div className="flex size-[58px] flex-col items-center justify-center rounded-full bg-surface">
        <span className="text-xl font-extrabold leading-none tabular-nums">{valor}</span>
        <span className="mt-0.5 text-[10px] font-medium text-muted">% match</span>
      </div>
    </div>
  );
}

function ResumoEmpresa({ info, buscando, erro }) {
  if (buscando) {
    return (
      <div className="flex items-center gap-3 text-sm text-muted">
        <Loader2 className="size-4 animate-spin text-brand" />
        Consultando a Receita Federal…
      </div>
    );
  }
  if (erro) {
    return (
      <div className="flex gap-2 rounded-md bg-alert-soft p-3 text-sm text-alert">
        <AlertCircle className="mt-0.5 size-4 shrink-0" />
        <span>{erro}</span>
      </div>
    );
  }
  if (!info) {
    return (
      <p className="text-sm text-muted">
        Digite o CNPJ e preenchemos CNAE, região, porte e quadro societário a partir dos dados da Receita Federal.
      </p>
    );
  }
  const ativa = info.situacao.toUpperCase() === 'ATIVA';
  return (
    <div className="space-y-3">
      <div>
        <p className="font-bold leading-snug">{info.nomeFantasia || info.razaoSocial}</p>
        {info.nomeFantasia && <p className="text-[13px] text-muted">{info.razaoSocial}</p>}
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[13px]">
        <dt className="text-muted">Situação</dt>
        <dd className={ativa ? 'font-semibold text-brand' : 'font-semibold text-alert'}>
          {info.situacao || 'Não informada'}
        </dd>
        <dt className="text-muted">Sede</dt>
        <dd>{[info.municipio, info.uf].filter(Boolean).join(' / ')}</dd>
        <dt className="text-muted">Porte</dt>
        <dd>{info.porte || 'Não informado'}</dd>
        <dt className="text-muted">CNAE</dt>
        <dd>
          {info.cnae} {info.cnaeDescricao && <span className="text-muted">· {info.cnaeDescricao}</span>}
        </dd>
      </dl>
      {!ativa && (
        <p className="text-[13px] text-alert">
          Empresas com situação diferente de ativa normalmente não podem participar de editais.
        </p>
      )}
    </div>
  );
}

function ItemEdital({ edital }) {
  return (
    <li className="flex gap-5 px-5 py-6 sm:px-7">
      <SeloCompatibilidade valor={edital.score} />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-brand">{edital.orgao}</p>
        <h3 className="mt-0.5 text-lg font-bold leading-snug">{edital.titulo}</h3>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Landmark className="size-3.5" /> {edital.tipo}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Wallet className="size-3.5" /> Até {edital.valorMaximo}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock className="size-3.5" /> {edital.prazo}
          </span>
        </div>
        <ul className="mt-3 space-y-1">
          {edital.motivos.map((m) => (
            <li key={m.texto} className="flex items-start gap-2 text-sm">
              {m.tipo === 'ok' ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand" />
              ) : (
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-alert" />
              )}
              <span className={m.tipo === 'ok' ? '' : 'text-alert'}>{m.texto}</span>
            </li>
          ))}
        </ul>
      </div>
    </li>
  );
}

export default function App() {
  const [form, setForm] = useState({
    descricaoEmpresa: '',
    cnpj: '',
    cnae: '',
    cnaeDescricao: '',
    uf: '',
    regiao: 'Sul',
    faturamentoAnual: FAIXAS_FATURAMENTO[1],
    qsa: '',
    isIctInovacao: false,
    rfbRegular: true,
    pgfnRegular: true,
  });
  const [empresa, setEmpresa] = useState(null);
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const [erroCnpj, setErroCnpj] = useState('');
  const [resultados, setResultados] = useState(null);
  const ultimaConsulta = useRef('');
  const resultadosRef = useRef(null);

  const atualizar = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const preencherPeloCnpj = async (cnpj) => {
    ultimaConsulta.current = cnpj;
    setBuscandoCnpj(true);
    setErroCnpj('');
    try {
      const info = await consultarCnpj(cnpj);
      if (ultimaConsulta.current !== cnpj) return; // usuário já digitou outro CNPJ
      setEmpresa(info);
      setForm((f) => ({
        ...f,
        cnae: info.cnae || f.cnae,
        cnaeDescricao: info.cnaeDescricao,
        uf: info.uf,
        regiao: info.regiao || f.regiao,
        faturamentoAnual: info.faixaFaturamento || f.faturamentoAnual,
        qsa: info.qsa || f.qsa,
      }));
    } catch (err) {
      if (ultimaConsulta.current !== cnpj) return;
      setEmpresa(null);
      setErroCnpj(err.message);
    } finally {
      if (ultimaConsulta.current === cnpj) setBuscandoCnpj(false);
    }
  };

  const alterarCnpj = (e) => {
    const mascarado = formatarCnpj(e.target.value);
    setForm((f) => ({ ...f, cnpj: mascarado, uf: '', cnaeDescricao: '' }));
    const limpo = limparCnpj(mascarado);
    if (limpo.length < 14) {
      ultimaConsulta.current = '';
      setBuscandoCnpj(false);
      setEmpresa(null);
      setErroCnpj('');
      return;
    }
    if (!cnpjValido(limpo)) {
      setEmpresa(null);
      setErroCnpj('CNPJ inválido. Confira os dígitos digitados.');
      return;
    }
    preencherPeloCnpj(limpo);
  };

  const buscar = (e) => {
    e.preventDefault();
    setResultados(buscarEditais(EDITAIS_DEMO, form));
    requestAnimationFrame(() =>
      resultadosRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    );
  };

  const compativeis = resultados?.filter((r) => r.score >= 55).length ?? 0;

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-4 sm:px-8">
          <span className="grid size-9 place-items-center rounded-lg bg-brand text-brand-ink">
            <Sprout className="size-5" />
          </span>
          <span className="text-lg font-extrabold tracking-tight">FomentoIO</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-20 pt-10 sm:px-8">
        <section className="max-w-2xl">
          <h1 className="text-3xl font-extrabold leading-[1.1] tracking-tight sm:text-[42px]">
            Encontre editais, fomento e crédito que combinam com a sua empresa.
          </h1>
          <p className="mt-4 text-[17px] leading-relaxed text-muted">
            Informe o CNPJ e conte o que você faz. Cruzamos atividade, porte, região e situação fiscal com as
            exigências de cada oportunidade.
          </p>
        </section>

        <form onSubmit={buscar} className="mt-10 grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
          <div className="space-y-8 rounded-xl border border-line bg-surface p-5 sm:p-7">
            <fieldset className="space-y-5">
              <legend className="mb-1 flex items-center gap-2 text-lg font-bold">
                <Building2 className="size-5 text-brand" /> Sua empresa
              </legend>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Rotulo htmlFor="cnpj">CNPJ</Rotulo>
                  <div className="relative">
                    <input
                      id="cnpj"
                      name="cnpj"
                      value={form.cnpj}
                      onChange={alterarCnpj}
                      placeholder="00.000.000/0001-00"
                      autoComplete="off"
                      className={`${campo} pr-10 tabular-nums`}
                      aria-invalid={Boolean(erroCnpj)}
                      required
                    />
                    {buscandoCnpj && (
                      <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-brand" />
                    )}
                  </div>
                </div>
                <div>
                  <Rotulo htmlFor="cnae" dica="preenchido pelo CNPJ">
                    CNAE principal
                  </Rotulo>
                  <input
                    id="cnae"
                    name="cnae"
                    value={form.cnae}
                    onChange={atualizar}
                    placeholder={buscandoCnpj ? 'Consultando…' : '6201-5/01'}
                    className={`${campo} tabular-nums`}
                  />
                </div>
              </div>

              <div>
                <Rotulo htmlFor="descricaoEmpresa">O que a sua empresa faz</Rotulo>
                <textarea
                  id="descricaoEmpresa"
                  name="descricaoEmpresa"
                  rows={4}
                  value={form.descricaoEmpresa}
                  onChange={atualizar}
                  placeholder="Ex.: Desenvolvemos uma plataforma de inteligência de dados para automação tributária e gestão financeira de pequenas empresas."
                  className={`${campo} resize-y leading-relaxed`}
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Rotulo htmlFor="regiao">Região de atuação</Rotulo>
                  <select id="regiao" name="regiao" value={form.regiao} onChange={atualizar} className={campo}>
                    {REGIOES.map((r) => (
                      <option key={r.valor} value={r.valor}>
                        {r.rotulo}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Rotulo htmlFor="faturamentoAnual">Faturamento anual</Rotulo>
                  <select
                    id="faturamentoAnual"
                    name="faturamentoAnual"
                    value={form.faturamentoAnual}
                    onChange={atualizar}
                    className={campo}
                  >
                    {FAIXAS_FATURAMENTO.map((f) => (
                      <option key={f}>{f}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Rotulo htmlFor="qsa" dica="preenchido pelo CNPJ">
                  Quadro societário
                </Rotulo>
                <input
                  id="qsa"
                  name="qsa"
                  value={form.qsa}
                  onChange={atualizar}
                  placeholder="Ex.: Maria Souza (Sócia-Administradora)"
                  className={campo}
                />
              </div>
            </fieldset>

            <div className="border-t border-line pt-7">
            <fieldset className="space-y-3">
              <legend className="mb-3 flex items-center gap-2 text-lg font-bold">
                <ShieldCheck className="size-5 text-brand" /> Projeto e situação fiscal
              </legend>
              <Marcador
                name="isIctInovacao"
                checked={form.isIctInovacao}
                onChange={atualizar}
                titulo="Tenho um projeto de inovação ou parceria com ICT"
                descricao="Universidades, institutos de pesquisa ou centros tecnológicos."
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Marcador
                  name="rfbRegular"
                  checked={form.rfbRegular}
                  onChange={atualizar}
                  titulo="Sem débitos na Receita Federal"
                  descricao="Certidão negativa (ou positiva com efeito de negativa)."
                />
                <Marcador
                  name="pgfnRegular"
                  checked={form.pgfnRegular}
                  onChange={atualizar}
                  titulo="Sem dívida ativa na PGFN"
                  descricao="Nenhuma inscrição em dívida ativa da União."
                />
              </div>
            </fieldset>
            </div>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-6">
            <div className="rounded-xl border border-line bg-surface p-5">
              <h2 className="mb-3 text-sm font-bold">Dados da Receita Federal</h2>
              <ResumoEmpresa info={empresa} buscando={buscandoCnpj} erro={erroCnpj} />
            </div>

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 py-4 text-base font-bold text-brand-ink transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/30"
            >
              <Search className="size-5" /> Buscar oportunidades
            </button>

            <div className="rounded-xl border border-dashed border-line p-5">
              <h2 className="text-sm font-bold">Fontes de dados</h2>
              <p className="mt-1 text-[13px] text-muted">Integrações em desenvolvimento.</p>
              <ul className="mt-3 space-y-2">
                {FONTES.map((f) => (
                  <li key={f.id} className="flex items-baseline justify-between gap-3 text-[13px]">
                    <span>
                      <span className="font-semibold">{f.nome}</span>
                      <span className="block text-muted">{f.detalhe}</span>
                    </span>
                    <span className="shrink-0 rounded-full bg-paper px-2 py-0.5 text-[11px] font-semibold text-muted">
                      em breve
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </form>

        <section ref={resultadosRef} className="scroll-mt-6">
          {resultados && (
            <div className="mt-12">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight">
                    {compativeis === 1 ? '1 oportunidade compatível' : `${compativeis} oportunidades compatíveis`}
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    Ordenadas por compatibilidade com o perfil informado.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex gap-2 rounded-md border border-sun/50 bg-sun/10 p-3 text-[13px]">
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-sun" />
                <span>
                  Versão de demonstração: os editais abaixo são exemplos ilustrativos, não chamadas oficiais abertas.
                  A pontuação já usa os dados reais da sua empresa.
                </span>
              </div>
              <ul className="mt-5 divide-y divide-line rounded-xl border border-line bg-surface">
                {resultados.map((e) => (
                  <ItemEdital key={e.id} edital={e} />
                ))}
              </ul>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
