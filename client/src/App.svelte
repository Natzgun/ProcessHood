<script>
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';

  const processes = writable([]);
  const results = writable([]);
  let newProcess = { pid: '', state: '', cpu: '', priority: '', arrivalTime: '' };
  let quantum = 4;
  let algorithm = 'RoundRobin';
  let cpuCount = 1;
  let pidToDelete = '';

  function mapProcessState(state) {
    const stateDescriptions = {
      S: "Durmiendo",
      Ss: "Durmiendo (líder de sesión)",
      "S<": "Durmiendo (alta prioridad)",
      I: "Inactivo",
      "I<": "Inactivo (alta prioridad)",
      R: "Ejecutándose",
      "R+": "Ejecutándose",
      D: "Espera ininterrumpible",
      Z: "Zombie",
      T: "Detenido",
    };
    return stateDescriptions[state] || "Desconocido";
  }

  async function loadProcesses() {
    try {
      const response = await fetch('http://localhost:3000/api/processes');
      const data = await response.json();
      if (data.success) {
        processes.set(data.data);
      }
    } catch (error) {
      console.error('Error al cargar los procesos:', error);
    }
  }

  function addProcess() {
    processes.update(current => [
      ...current,
      { ...newProcess, arrivalTime: parseInt(newProcess.arrivalTime) || 0, priority: parseInt(newProcess.priority) || 0 },
    ]);
    newProcess = { pid: '', state: '', cpu: '', priority: '', arrivalTime: '' };
  }

  function deleteAllProcesses() {
    processes.set([]);
  }

  function deleteProcessByPid() {
    processes.update(current => current.filter(process => process.pid !== pidToDelete));
    pidToDelete = '';
  }

  async function simulate() {
    const processesData = $processes.map(p => ({
      pid: p.pid,
      rafaga: parseFloat(p.cpu) || 1,
      priority: p.priority,
      arrivalTime: p.arrivalTime,
    }));

    try {
      const response = await fetch('http://localhost:3000/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ algorithm, processes: processesData, quantum, cpuCount }),
      });
      const data = await response.json();
      if (data.success) {
        results.set(data.data);
      }
    } catch (error) {
      console.error('Error en la simulación:', error);
    }
  }

  onMount(() => {
    loadProcesses();
  });
</script>

<div class="container mx-auto p-4">
  <h1 class="text-2xl font-bold mb-4">Simulación de Planificación de Procesos</h1>

  <h2 class="text-xl font-semibold mb-2">Procesos actuales</h2>
  <!-- Tabla de procesos -->
  <table class="table-auto w-full border-collapse border border-gray-300 mb-4">
    <thead>
    <tr class="bg-gray-100">
      <th class="border border-gray-300 px-4 py-2">PID</th>
      <th class="border border-gray-300 px-4 py-2">Estado</th>
      <th class="border border-gray-300 px-4 py-2">CPU</th>
      <th class="border border-gray-300 px-4 py-2">Prioridad</th>
      <th class="border border-gray-300 px-4 py-2">Tiempo de Llegada</th>
    </tr>
    </thead>
    <tbody>
    {#each $processes as process}
      <tr class="hover:bg-gray-50">
        <td class="border border-gray-300 px-4 py-2">{process.pid}</td>
        <td class="border border-gray-300 px-4 py-2">{mapProcessState(process.state)}</td>
        <td class="border border-gray-300 px-4 py-2">{process.cpu}</td>
        <td class="border border-gray-300 px-4 py-2">{process.priority}</td>
        <td class="border border-gray-300 px-4 py-2">{process.arrivalTime}</td>
      </tr>
    {/each}
    </tbody>
  </table>

  <button on:click={loadProcesses} class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mb-4">Recargar Procesos del SO</button>
  <button on:click={deleteAllProcesses} class="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 mb-4">Eliminar Todos los Procesos</button>

    <h2 class="text-xl font-semibold mb-2">Agregar Proceso</h2>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <label class="block">
            PID:
            <input type="text" bind:value={newProcess.pid} class="w-full border rounded p-2" />
        </label>
        <label class="block">
            Estado:
            <input type="text" bind:value={newProcess.state} class="w-full border rounded p-2" />
        </label>
        <label class="block">
            CPU:
            <input type="number" bind:value={newProcess.cpu} class="w-full border rounded p-2" />
        </label>
        <label class="block">
            Prioridad:
            <input type="number" bind:value={newProcess.priority} class="w-full border rounded p-2" />
        </label>
        <label class="block">
            Tiempo de Llegada:
            <input type="number" bind:value={newProcess.arrivalTime} class="w-full border rounded p-2" />
        </label>
    </div>
    <button on:click={addProcess} class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">Agregar</button>

    <h2 class="text-xl font-semibold my-4">Configuración de Simulación</h2>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <label class="block">
      Cantidad de CPUs:
      <input type="number" bind:value={cpuCount} min="1" class="w-full border rounded p-2" />
    </label>
    <label class="block">
      Algoritmo:
      <select bind:value={algorithm} class="w-full border rounded p-2">
        <option value="RoundRobin">Round Robin</option>
        <option value="FCFS">FCFS</option>
        <option value="PriorityScheduling">Priority Scheduling</option>
      </select>
    </label>
    {#if algorithm === 'RoundRobin'}
      <label class="block">
        Quantum:
        <input type="number" bind:value={quantum} min="1" class="w-full border rounded p-2" />
      </label>
    {/if}
  </div>
  <button on:click={simulate} class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 mt-4">Simular</button>

  <h2 class="text-xl font-semibold my-4">Resultados</h2>
  {#each $results as result}
    <div class="mb-4">
      <h3 class="text-lg font-semibold">CPU {result.cpu}</h3>
      <table class="table-auto w-full border-collapse border border-gray-300">
        <thead>
        <tr class="bg-gray-100">
          <th class="border border-gray-300 px-4 py-2">PID</th>
          <th class="border border-gray-300 px-4 py-2">Inicio</th>
          <th class="border border-gray-300 px-4 py-2">Fin</th>
        </tr>
        </thead>
        <tbody>
        {#each result.processes as process}
          <tr class="hover:bg-gray-50">
            <td class="border border-gray-300 px-4 py-2">{process.pid}</td>
            <td class="border border-gray-300 px-4 py-2">{process.startTime}</td>
            <td class="border border-gray-300 px-4 py-2">{process.endTime}</td>
          </tr>
        {/each}
        </tbody>
      </table>
    </div>
  {/each}
</div>
