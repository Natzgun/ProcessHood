import express from 'express';
import { exec } from 'child_process';

const app = express();
const PORT = 3000;

/**
 * Procesa la salida del comando `ps -aux` en Linux.
 * Convierte la salida de texto en un arreglo de objetos.
 * @param {string} stdout - Salida del comando `ps -aux`.
 * @returns {Array} Arreglo de objetos con la información de los procesos.
 */
function parseLinuxProcesses(stdout) {
  const lines = stdout.split('\n').slice(1); // Ignorar la primera línea (encabezado)
  return lines.map(line => {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 11) {
      return {
        user: parts[0],
        pid: parts[1],
        cpu: parts[2],
        mem: parts[3],
        vsz: parts[4],
        rss: parts[5],
        tty: parts[6],
        stat: parts[7],
        start: parts[8],
        time: parts[9],
        command: parts.slice(10).join(' '),
      };
    }
    return null;
  }).filter(Boolean); // Eliminar cualquier valor nulo
}

/**
 * Procesa la salida del comando `tasklist` en Windows.
 * Convierte la salida de texto en un arreglo de objetos.
 * @param {string} stdout - Salida del comando `tasklist`.
 * @returns {Array} Arreglo de objetos con la información de los procesos.
 */
function parseWindowsProcesses(stdout) {
  const lines = stdout.split('\n').slice(3); // Ignorar las primeras líneas (encabezados)
  return lines.map(line => {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 5) {
      return {
        imageName: parts[0],
        pid: parts[1],
        sessionName: parts[2],
        sessionId: parts[3],
        memUsage: parts[4],
      };
    }
    return null;
  }).filter(Boolean); // Eliminar cualquier valor nulo
}

/**
 * Obtiene los procesos del sistema operativo actual.
 * @returns {Promise<Array>} Promesa que resuelve con un arreglo de objetos de procesos.
 */
function fetchProcesses() {
  const isWindows = process.platform === 'win32';
  const command = isWindows ? 'tasklist' : 'ps -aux';

  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Error ejecutando comando: ${stderr || error.message}`));
      } else {
        const processes = isWindows ? parseWindowsProcesses(stdout) : parseLinuxProcesses(stdout);
        resolve(processes);
      }
    });
  });
}

/**
 * Endpoint para obtener los procesos del sistema.
 */
app.get('/processes', async (req, res) => {
  try {
    const processes = await fetchProcesses();
    res.status(200).json({
      success: true,
      data: processes,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Inicia el servidor
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});

