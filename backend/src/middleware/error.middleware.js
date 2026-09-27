const errorHandler = (err, req, res, next) => {
  console.error('[Error Handler]', err);

  // Prisma unique constraint violation
  if (err.code === 'P2002') {
    const target = err.meta?.target ? err.meta.target.join(', ') : 'field';
    return res.status(400).json({
      success: false,
      message: `A record with this ${target} already exists.`,
    });
  }

  // Zod validation error
  if (err.name === 'ZodError') {
    const issues = err.errors || err.issues || [];
    return res.status(400).json({
      success: false,
      message: issues.length > 0 ? issues[0].message : 'Validation failed',
      errors: issues.map(e => ({ field: Array.isArray(e.path) ? e.path.join('.') : String(e.path), message: e.message })),
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message: process.env.NODE_ENV === 'production' && statusCode === 500 ? 'Internal Server Error' : message,
  });
};

module.exports = errorHandler;
