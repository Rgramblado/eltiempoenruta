/**
 * Valida una parte del request (body o query) contra un esquema Zod.
 * Responde 400 con el primer mensaje legible si la validación falla.
 */
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const issue = result.error.issues[0];
      const path = issue.path.length ? ` (${issue.path.join('.')})` : '';
      return res.status(400).json({ error: `Petición inválida${path}: ${issue.message}` });
    }
    req[source === 'query' ? 'validatedQuery' : source] = result.data;
    next();
  };
}
