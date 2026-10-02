// 🔍 Utilitário para verificar se o backend está rodando
// Este arquivo ajuda a diagnosticar problemas de conexão com a API

import { BACKEND_URL } from '../lib/api';

export async function checkBackendHealth(): Promise<{
  isRunning: boolean;
  message: string;
  instructions?: string[];
}> {
  try {
    // Tenta conectar na URL raiz do backend
    const response = await fetch(`${BACKEND_URL}/`, {
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