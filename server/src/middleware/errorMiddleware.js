export function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Endpoint no encontrado.' });
}

export function errorHandler(err, req, res, next) {
  const status = err.statusCode || 500;
  res.status(status).json({ error: err.message || 'Error interno.' });
}
