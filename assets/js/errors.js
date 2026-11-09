/** Erro padronizado das chamadas à API. */
export class ApiError extends Error {
  /**
   * @param {number} status   HTTP status (0 = rede/timeout)
   * @param {string} code     código de erro do backend (ex.: 'validation_error', 'already_participated')
   * @param {object} fields   erros por campo: { cpf: 'mensagem', ... }
   */
  constructor(status, code, message, fields = {}) {
    super(message || code);
    this.status = status; this.code = code; this.fields = fields;
  }
}
