export async function checkOllamaStatus() {
  try {
    const response = await fetch('http://localhost:11434/api/version');
    return {
      status: response.ok ? 'online' : 'offline',
      version: response.ok ? await response.json() : null
    };
  } catch (error) {
    return {
      status: 'offline',
      version: null,
      error: error instanceof Error ? error.message : 'Failed to connect to Ollama server'
    };
  }
}
