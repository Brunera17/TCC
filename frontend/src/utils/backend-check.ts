// 🔍 Utilitário para verificar se o backend está rodando
// Este arquivo ajuda a diagnosticar problemas de conexão com a API

export async function checkBackendHealth(): Promise<{
  isRunning: boolean;
  message: string;
  instructions?: string[];
}> {
  try {
    // Tenta conectar na URL raiz do backend
    const response = await fetch('http://localhost:5000/', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (response.ok) {
      return {
        isRunning: true,
        message: '✅ Backend está rodando e respondendo corretamente!',
      };
    } else {
      return {
        isRunning: false,
        message: `❌ Backend respondeu com erro: ${response.status} ${response.statusText}`,
        instructions: [
          'Verifique os logs do servidor backend',
          'Confirme se todas as dependências estão instaladas',
          'Reinicie o servidor backend'
        ]
      };
    }
  } catch (error) {
    return {
      isRunning: false,
      message: '❌ Não foi possível conectar ao backend',
      instructions: [
        '1. Navegue até a pasta do backend:',
        '   cd "C:\\Users\\dbrun\\OneDrive\\Desktop\\TCC real oficial\\backend"',
        '',
        '2. Instale as dependências (se necessário):',
        '   pip install -r requirements.txt',
        '',
        '3. Execute o servidor:',
        '   python main.py',
        '',
        '4. Verifique se está rodando na porta 5000:',
        '   http://localhost:5000',
        '',
        '5. Se o erro persistir, verifique:',
        '   • Firewall não está bloqueando a porta 5000',
        '   • Nenhum outro serviço está usando a porta 5000',
        '   • As configurações de CORS estão corretas'
      ]
    };
  }
}

export function showBackendInstructions() {
  console.group('🚀 Como iniciar o backend:');
  console.log('1. Abra um novo terminal');
  console.log('2. Navegue até a pasta do backend:');
  console.log('   cd "C:\\Users\\dbrun\\OneDrive\\Desktop\\TCC real oficial\\backend"');
  console.log('3. Execute o servidor:');
  console.log('   python main.py');
  console.log('4. Aguarde a mensagem: "Running on http://localhost:5000"');
  console.log('5. Recarregue esta página');
  console.groupEnd();
}

// Função para mostrar status no console do navegador
export async function debugBackendConnection() {
  console.group('🔍 Diagnóstico da conexão com backend');
  
  const health = await checkBackendHealth();
  console.log(health.message);
  
  if (!health.isRunning && health.instructions) {
    console.group('📋 Instruções para resolver:');
    health.instructions.forEach(instruction => {
      if (instruction === '') {
        console.log('');
      } else {
        console.log(instruction);
      }
    });
    console.groupEnd();
  }
  
  console.groupEnd();
}