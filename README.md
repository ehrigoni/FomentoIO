# FomentoIO

Agente de editais, fomento e crédito: a empresa informa o CNPJ e uma descrição do que faz, e o app cruza atividade (CNAE), porte, região e situação fiscal com as exigências de cada oportunidade.

## O que já funciona

- Consulta automática do CNPJ (BrasilAPI / Receita Federal): preenche CNAE, região, porte e quadro societário.
- Validação dos dígitos do CNPJ, incluindo o novo formato alfanumérico.
- Pontuação de compatibilidade com motivos ("atende a região Sul", "exige CND", etc.).

## O que ainda é demonstração

- O catálogo de editais em `src/data/editais.js` é ilustrativo. Os próximos passos são as integrações com PNCP, Portal da Transparência (CEIS/CNEP) e Serpro.

## Rodando localmente

```bash
npm install
npm run dev
```

Em desenvolvimento, `/api/cnpj/:cnpj` é repassado para a BrasilAPI pelo proxy do Vite. Na Vercel, a rota é atendida pela função `api/cnpj/[cnpj].js`, com cache de 24 h.

## Deploy

Projeto Vite padrão: a Vercel detecta tudo sozinha (build `npm run build`, saída `dist`). Cada push na branch `main` gera um novo deploy.
