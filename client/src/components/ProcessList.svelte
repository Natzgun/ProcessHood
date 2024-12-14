<script>
  import { onMount } from 'svelte';
  import { obtenerProcesos } from '../services/api.js';

  let procesos = [];
  let modalProceso = null;

  onMount(async () => {
    const response = await obtenerProcesos();
    if (response.success) {
      procesos = response.data;
    }
    procesos = response.data.sort((a, b) => parseInt(a.pid) - parseInt(b.pid));
  });

  function abrirModal(proceso) {
    modalProceso = proceso;
  }

  function cerrarModal() {
    modalProceso = null;
  }
</script>

<style>
  .grid-container {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 10px;
  }
  .grid-item {
    border: 1px solid #ccc;
    padding: 10px;
    border-radius: 5px;
    cursor: pointer;
  }
</style>

<div class="grid-container">
  {#each procesos as proceso}
    <div class="grid-item" on:click={() => abrirModal(proceso)}>
      <p><strong>PID:</strong> {proceso.pid}</p>
    </div>
  {/each}
</div>

{#if modalProceso}
  <!-- Modal -->
  <div class="fixed inset-0 bg-gray-500 bg-opacity-75 flex justify-center items-center">
    <div class="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full">
      <button class="text-white bg-red-500 p-2" on:click={cerrarModal}>Cerrar</button>
      <div class="mt-4">
        <p><strong>User:</strong> {modalProceso.user}</p>
        <p><strong>PID:</strong> {modalProceso.pid}</p>
        <p><strong>CPU:</strong> {modalProceso.cpu}</p>
        <p><strong>Memory:</strong> {modalProceso.mem}</p>
        <p><strong>VSZ:</strong> {modalProceso.vsz}</p>
        <p><strong>RSS:</strong> {modalProceso.rss}</p>
        <p><strong>TTY:</strong> {modalProceso.tty}</p>
        <p><strong>Status:</strong> {modalProceso.stat}</p>
        <p><strong>Start:</strong> {modalProceso.start}</p>
        <p><strong>Time:</strong> {modalProceso.time}</p>
        <p><strong>Command:</strong> {modalProceso.command}</p>
      </div>
    </div>
  </div>
{/if}
