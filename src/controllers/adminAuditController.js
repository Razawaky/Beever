import * as adminAuditService from '../services/adminAuditService.js';
import { assincrono } from '../utils/erros.js';
import { renderizarPagina } from '../utils/pagina.js';
import { querJson } from '../utils/resposta.js';

/**
 * Consulta da trilha de auditoria (RF-ADM-05). Só leitura: a tabela é
 * append-only por gatilho, e aqui não existe nenhuma rota que escreva.
 */

const FUNDO_ADMIN = 'min-h-screen bg-cera text-tinta antialiased';

export const consultar = assincrono(async (req, res) => {
  const resultado = await adminAuditService.consultar(req.query);
  if (querJson(req)) return res.json(resultado);

  // A paginação entra como `paginacao`, e não `pagina`: o layout usa `pagina`
  // para saber qual view renderizar, e espalhar o resultado por cima apagaria o
  // caminho do arquivo.
  renderizarPagina(res, 'admin/auditoria', {
    titulo: 'Auditoria — administração do Beever',
    classeBody: FUNDO_ADMIN,
    emailDoAdmin: req.session.email,
    linhas: resultado.linhas,
    acoes: resultado.acoes,
    filtros: resultado.filtros,
    tiposDeAtor: resultado.tiposDeAtor,
    paginacao: resultado.pagina,
    limiteDoCsv: resultado.limiteDoCsv,
    // A tela devolve os filtros como vieram, para o formulário continuar
    // preenchido depois de consultar.
    enviados: req.query,
  });
});

export const exportar = assincrono(async (req, res) => {
  const csv = await adminAuditService.exportarCsv(req.query);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="auditoria-beever.csv"');
  res.send(csv);
});
