/**
 * Helpers HTTP compartilhados pelas rotas.
 * (O Express 4 não captura erros lançados em handlers async,
 * por isso o wrapper `wrap` encaminha as rejeições ao middleware de erro.)
 */

/** Cria um erro com status HTTP. */
export function httpError(status, message) {
  const err = new Error(message)
  err.status = status
  return err
}

/** Envolve um handler async para que erros cheguem ao middleware de erro. */
export function wrap(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
}
