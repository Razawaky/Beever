/**
 * Página inicial provisória. Ganha conteúdo de verdade quando as telas forem
 * migradas para EJS.
 */
export function mostrar(req, res) {
  res.render('pages/home', { titulo: 'Beever' });
}
