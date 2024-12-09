const BASE_URL = 'http://localhost:3000/api';

export const obtenerProcesos = async () => {
  const res = await fetch(`${BASE_URL}/processes`);
  return res.json();
};

export const crearProceso = async (proceso) => {
  const res = await fetch(`${BASE_URL}/processes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(proceso),
  });
  return res.json();
};

export const eliminarProceso = async (id) => {
  await fetch(`${BASE_URL}/procesos/${id}`, { method: 'DELETE' });
};
