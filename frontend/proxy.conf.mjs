const backend = `http://localhost:${process.env['BACKEND_PORT'] ?? '8080'}`;

export default {
  '/api': { target: backend, secure: false },
  '/ws': { target: backend, secure: false, ws: true },
};
