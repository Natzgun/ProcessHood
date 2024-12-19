import express from 'express';
import { exec } from 'child_process';
import cors from 'cors';

const app = express();
const PORT = 3000;
app.use(cors());
app.use(express.json());

function parseLinuxProcesses(stdout) {
  const lines = stdout.split('\n').slice(1);
  return lines.map(line => {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 5) {
      return {
        pid: parts[0],
        state: parts[1],
        command: parts[2],
        cpu: parseFloat(parts[3]) || parseFloat(Math.random() * 10).toFixed(3),
        priority: parseInt(parts[4]) || 0,
        arrivalTime: Math.floor(Math.random() * 1000),
      };
    }
    return null;
  }).filter(Boolean);
}

function parseWindowsProcesses(stdout) {
  const lines = stdout.trim().split('\n').slice(1);
  return lines.map(line => {
    const parts = line.trim().match(/(.+?)\s+(\d+)$/);
    if (parts && parts.length === 3) {
      return {
        command: parts[1].trim(),
        pid: parts[2],
        state: 'running',
        cpu: parseFloat((Math.random() * 10).toFixed(2)),
        priority: Math.floor(Math.random() * 10),
        arrivalTime: Math.floor(Math.random() * 100),
      };
    }
    return null;
  }).filter(Boolean);
}

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

function simulateMultiCPU(processes, algorithm, quantum, numCPUs) {
  const cpuQueues = Array.from({ length: numCPUs }, () => []);
  processes.forEach((process, index) => {
    cpuQueues[index % numCPUs].push(process);
  });

  const results = cpuQueues.map(queue => {
    switch (algorithm) {
      case 'RoundRobin':
        return simulateRoundRobin(queue, quantum);
      case 'FCFS':
        return simulateFCFS(queue);
      case 'PriorityScheduling':
        return simulatePriorityScheduling(queue);
      default:
        throw new Error('Algoritmo no soportado.');
    }
  });

  return results.flat();
}

app.get('/api/processes', async (req, res) => {
  try {
    const processes = await fetchProcesses();
    res.status(200).json({ success: true, data: processes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/simulate', (req, res) => {
  const { algorithm, processes, quantum, numCPUs } = req.body;

  if (!processes || !Array.isArray(processes)) {
    return res.status(400).json({ success: false, message: 'Lista de procesos inválida.' });
  }

  if (typeof numCPUs !== 'number' || numCPUs <= 0) {
    return res.status(400).json({ success: false, message: 'Número de CPUs inválido.' });
  }

  try {
    const result = simulateMultiCPU(processes, algorithm, quantum, numCPUs);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});