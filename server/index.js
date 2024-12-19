import express from 'express';
import {exec} from 'child_process';
import cors from 'cors';


const app = express();
const PORT = 3000;
app.use(cors());

app.use(express.json());

/**
 * Procesa la salida del comando `ps -eo pid,stat,comm,%cpu,priority` en Linux.
 * Convierte la salida de texto en un arreglo de objetos con detalles de los procesos.
 */
function parseLinuxProcesses(stdout) {
  const lines = stdout.split('\n').slice(1); // Ignorar encabezado
  return lines.map(line => {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 5) {
      return {
        pid: parts[0],
        state: parts[1], // Estado del proceso (R, S, etc.)
        command: parts[2],
        cpu: parseFloat(parts[3]) || parseFloat(Math.random() * 10).toFixed(3),
        priority: parseInt(parts[4]) || 0,
        arrivalTime: Math.floor(Math.random() * 1000),
      };
    }
    return null;
  }).filter(Boolean);
}

/**
 * Procesa la salida del comando `wmic process get` en Windows.
 * Convierte la salida de texto en un arreglo de objetos con detalles de los procesos.
 */
function parseWindowsProcesses(stdout) {
  const lines = stdout.trim().split('\n').slice(1); // Ignorar encabezado
  return lines.map(line => {
    const parts = line.trim().match(/(.+?)\s+(\d+)$/); // Captura el nombre del proceso y el PID
    if (parts && parts.length === 3) {
      return {
        command: parts[1].trim(), // Nombre del proceso
        pid: parts[2], // PID
        state: 'running', // Inferir estado como "running" (WMIC no incluye estado directamente)
        cpu: parseFloat((Math.random() * 10).toFixed(2)), // Simular uso de CPU
        priority: Math.floor(Math.random() * 10), // Generar prioridad aleatoria
        arrivalTime: Math.floor(Math.random() * 100), // Generar tiempo de llegada aleatorio
      };
    }
    return null;
  }).filter(Boolean);
}


/**
 * Obtiene los procesos del sistema operativo actual.
 * @returns {Promise<Array>} Promesa que resuelve con un arreglo de procesos.
 */
function fetchProcesses() {
  const isWindows = process.platform === 'win32';
  const command = isWindows ? 'wmic process get ProcessId,CommandLine' : 'ps -eo pid,stat,comm,%cpu,priority';

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
 * Simula el algoritmo Round Robin.
 * @param {Array} processes - Lista de procesos.
 * @param {number} quantum - Quantum de tiempo para la CPU.
 * @returns {Array} Resultados de la simulación.
 */
function simulateRoundRobin(processes, quantum) {
  let time = 0;
  const queue = [...processes];
  const result = [];

  while (queue.length > 0) {
    const process = queue.shift();
    const burst = Math.min(process.rafaga, quantum);

    result.push({
      pid: process.pid,
      startTime: time,
      endTime: time + burst,
    });

    time += burst;
    process.rafaga -= burst;

    if (process.rafaga > 0) {
      queue.push(process);
    }
  }

  return result;
}

/**
 * Simula el algoritmo FCFS.
 * @param {Array} processes - Lista de procesos.
 * @returns {Array} Resultados de la simulación.
 */
function simulateFCFS(processes) {
  let time = 0;
  return processes.map(process => {
    const startTime = time;
    const endTime = time + process.rafaga;
    time = endTime;

    return {
      pid: process.pid,
      startTime,
      endTime,
    };
  });
}

/**
 * Simula el algoritmo de planificación por prioridad.
 * @param {Array} processes - Lista de procesos.
 * @returns {Array} Resultados de la simulación.
 */
function simulatePriorityScheduling(processes) {
  let time = 0;
  const sortedProcesses = [...processes].sort((a, b) => a.priority - b.priority);
  return sortedProcesses.map(process => {
    const startTime = time;
    const endTime = time + process.rafaga;
    time = endTime;

    return {
      pid: process.pid,
      startTime,
      endTime,
    };
  });
}

/**
 * Endpoint para obtener los procesos del sistema.
 */
app.get('/api/processes', async (req, res) => {
  try {
    const processes = await fetchProcesses();
    res.status(200).json({success: true, data: processes});
  } catch (error) {
    res.status(500).json({success: false, message: error.message});
  }
});

/**
 * Endpoint para simular algoritmos de planificación.
 */
/**
 * Divide los procesos en N listas para simular múltiples CPUs.
 * @param {Array} processes - Lista de procesos.
 * @param {number} cpuCount - Número de CPUs.
 * @returns {Array} Arreglo de listas de procesos divididos por CPU.
 */
function divideProcesses(processes, cpuCount) {
  const divided = Array.from({ length: cpuCount }, () => []);
  processes.forEach((process, index) => {
    divided[index % cpuCount].push(process);
  });
  return divided;
}

/**
 * Endpoint para simular algoritmos de planificación con múltiples CPUs.
 */
app.post('/api/simulate', (req, res) => {
  const { algorithm, processes, quantum, cpuCount } = req.body;

  if (!processes || !Array.isArray(processes)) {
    return res.status(400).json({ success: false, message: 'Lista de procesos inválida.' });
  }

  if (typeof cpuCount !== 'number' || cpuCount <= 0) {
    return res.status(400).json({ success: false, message: 'Número de CPUs inválido.' });
  }

  // Dividir procesos entre las CPUs
  const dividedProcesses = divideProcesses(processes, cpuCount);

  let results = [];
  dividedProcesses.forEach((cpuProcesses, index) => {
    let cpuResult;
    switch (algorithm) {
      case 'RoundRobin':
        if (typeof quantum !== 'number' || quantum <= 0) {
          return res.status(400).json({ success: false, message: 'Quantum inválido para Round Robin.' });
        }
        cpuResult = simulateRoundRobin(cpuProcesses, quantum);
        break;
      case 'FCFS':
        cpuResult = simulateFCFS(cpuProcesses);
        break;
      case 'PriorityScheduling':
        cpuResult = simulatePriorityScheduling(cpuProcesses);
        break;
      default:
        return res.status(400).json({ success: false, message: 'Algoritmo no soportado.' });
    }

    results.push({ cpu: index + 1, processes: cpuResult });
  });

  res.status(200).json({ success: true, data: results });
});

app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
