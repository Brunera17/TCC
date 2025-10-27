/**
 * Utilitários para cálculos relacionados a propostas
 */

import type { Cliente, RegimeTributario } from '../types';

export const isMEI = (regimeTributario: RegimeTributario): boolean => {
  if (!regimeTributario) return false;
  
  return regimeTributario.codigo.toLowerCase().includes('mei') ||
         regimeTributario.nome.toLowerCase().includes('microempreendedor') ||
         regimeTributario.nome.toLowerCase().includes('mei');
};

export const calcularTaxaAbertura = (cliente: Cliente, regimeTributario: RegimeTributario): number => {
  if (!cliente?.abertura_empresa) return 0;
  return isMEI(regimeTributario) ? 300.00 : 1000.00;
};

export const getTipoAbertura = (cliente: Cliente, regimeTributario: RegimeTributario): string => {
  if (!cliente?.abertura_empresa) return '';
  return isMEI(regimeTributario) ? 'MEI' : 'Empresa';
};

export const calcularDesconto = (valorBase: number, percentualDesconto: number): number => {
  return (valorBase * percentualDesconto) / 100;
};

export const calcularValorFinal = (valorBase: number, percentualDesconto: number): number => {
  const desconto = calcularDesconto(valorBase, percentualDesconto);
  return valorBase - desconto;
};

export const validarDesconto = (percentualDesconto: number): {
  valido: boolean;
  requerAprovacao: boolean;
  mensagem: string;
} => {
  if (percentualDesconto === 0) {
    return {
      valido: true,
      requerAprovacao: false,
      mensagem: 'Nenhum desconto aplicado'
    };
  }
  
  if (percentualDesconto <= 20) {
    return {
      valido: true,
      requerAprovacao: false,
      mensagem: 'Desconto dentro do limite permitido'
    };
  }
  
  if (percentualDesconto <= 100) {
    return {
      valido: true,
      requerAprovacao: true,
      mensagem: 'Desconto requer aprovação do administrador'
    };
  }
  
  return {
    valido: false,
    requerAprovacao: false,
    mensagem: 'Desconto inválido (máximo 100%)'
  };
};
