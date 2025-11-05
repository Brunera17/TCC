export interface ValidationError {
  field: string;
  message: string;
  value: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  sanitizedData: any;
}

/**
 * Valida e sanitiza dados de cliente antes de enviar para a API
 * Nota: abertura_empresa é uma regra de negócio do frontend, não vai para o backend
 */
export function validateClienteData(data: any): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const sanitizedData: any = { ...data };

  // Validações obrigatórias
  if (!data.nome || typeof data.nome !== 'string' || data.nome.trim().length === 0) {
    errors.push({
      field: 'nome',
      message: 'Nome é obrigatório e deve ser uma string não vazia',
      value: data.nome
    });
  } else {
    sanitizedData.nome = data.nome.trim();
  }

  // Validação de CPF
  if (data.cpf !== null && data.cpf !== undefined) {
    if (typeof data.cpf !== 'string' || data.cpf.trim().length === 0) {
      warnings.push({
        field: 'cpf',
        message: 'CPF deve ser uma string válida ou null',
        value: data.cpf
      });
      sanitizedData.cpf = null;
    } else {
      const cpfNumbers = data.cpf.replace(/\D/g, '');
      if (cpfNumbers.length !== 11 && cpfNumbers.length !== 0) {
        warnings.push({
          field: 'cpf',
          message: 'CPF deve ter 11 dígitos ou ser vazio',
          value: data.cpf
        });
      }
      sanitizedData.cpf = cpfNumbers.length === 11 ? cpfNumbers : null;
    }
  }

  // Validação de email
  if (data.email !== null && data.email !== undefined) {
    if (typeof data.email !== 'string') {
      warnings.push({
        field: 'email',
        message: 'Email deve ser uma string ou null',
        value: data.email
      });
      sanitizedData.email = null;
    } else if (data.email.trim().length === 0) {
      sanitizedData.email = null;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        warnings.push({
          field: 'email',
          message: 'Email não possui formato válido',
          value: data.email
        });
      }
      sanitizedData.email = data.email.trim();
    }
  }

  // Validação de telefone
  if (data.telefone !== null && data.telefone !== undefined) {
    if (typeof data.telefone !== 'string') {
      warnings.push({
        field: 'telefone',
        message: 'Telefone deve ser uma string ou null',
        value: data.telefone
      });
      sanitizedData.telefone = null;
    } else if (data.telefone.trim().length === 0) {
      sanitizedData.telefone = null;
    } else {
      const phoneNumbers = data.telefone.replace(/\D/g, '');
      if (phoneNumbers.length < 10 || phoneNumbers.length > 11) {
        warnings.push({
          field: 'telefone',
          message: 'Telefone deve ter 10 ou 11 dígitos',
          value: data.telefone
        });
      }
      sanitizedData.telefone = data.telefone.trim();
    }
  }

  // Validação de endereço
  if (data.endereco !== null && data.endereco !== undefined) {
    if (typeof data.endereco !== 'object') {
      warnings.push({
        field: 'endereco',
        message: 'Endereço deve ser um objeto ou null',
        value: data.endereco
      });
      sanitizedData.endereco = null;
    } else {
      const enderecoErros = validateEnderecoData(data.endereco);
      if (enderecoErros.length > 0) {
        warnings.push(...enderecoErros);
      }
    }
  }

  // Validação de entidade_juridica
  if (data.entidade_juridica !== null && data.entidade_juridica !== undefined) {
    if (typeof data.entidade_juridica !== 'object') {
      warnings.push({
        field: 'entidade_juridica',
        message: 'Entidade jurídica deve ser um objeto ou null',
        value: data.entidade_juridica
      });
      sanitizedData.entidade_juridica = null;
    } else {
      const empresaErros = validateEmpresaData(data.entidade_juridica);
      if (empresaErros.length > 0) {
        warnings.push(...empresaErros);
      }
    }
  }

  // Remove campos undefined/null e campos que são apenas para frontend
  Object.keys(sanitizedData).forEach(key => {
    if (sanitizedData[key] === undefined) {
      delete sanitizedData[key];
    }
  });

  // Remove campos específicos que não devem ir para o backend
  delete sanitizedData.abertura_empresa; // Campo apenas para lógica de negócio frontend

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sanitizedData
  };
}

function validateEnderecoData(endereco: any): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!endereco || typeof endereco !== 'object') {
    errors.push({
      field: 'endereco',
      message: 'Endereço deve ser um objeto válido',
      value: endereco
    });
    return errors;
  }

  const enderecoNormalizado = {
    ...endereco,
    logradouro:
      typeof endereco?.logradouro === 'string'
        ? endereco.logradouro
        : typeof endereco?.rua === 'string'
        ? endereco.rua
        : endereco.logradouro
  };

  const camposTexto: Array<{ chave: keyof typeof endereco; nome: string; obrigatorio?: boolean }> = [
    { chave: 'logradouro', nome: 'Logradouro', obrigatorio: true },
    { chave: 'numero', nome: 'Número', obrigatorio: true },
    { chave: 'bairro', nome: 'Bairro', obrigatorio: true },
    { chave: 'cidade', nome: 'Cidade', obrigatorio: true },
    { chave: 'estado', nome: 'Estado', obrigatorio: true },
    { chave: 'complemento', nome: 'Complemento' }
  ];

  camposTexto.forEach(({ chave, nome, obrigatorio }) => {
    const valor = enderecoNormalizado[chave] ?? endereco[chave];
    if (valor === undefined || valor === null || valor === '') {
      if (obrigatorio) {
        errors.push({
          field: `endereco.${String(chave)}`,
          message: `${nome} é obrigatório quando o endereço é informado`,
          value: valor
        });
      }
      return;
    }

    if (typeof valor !== 'string') {
      errors.push({
        field: `endereco.${String(chave)}`,
        message: `${nome} deve ser uma string`,
        value: valor
      });
    }
  });

  if (typeof endereco.estado === 'string' && endereco.estado.trim().length !== 2) {
    errors.push({
      field: 'endereco.estado',
      message: 'Estado deve possuir exatamente 2 caracteres',
      value: endereco.estado
    });
  }

  if (endereco.cep !== undefined && endereco.cep !== null && endereco.cep !== '') {
    if (typeof endereco.cep !== 'string') {
      errors.push({
        field: 'endereco.cep',
        message: 'CEP deve ser uma string',
        value: endereco.cep
      });
    } else {
      const cepNumbers = endereco.cep.replace(/\D/g, '');
      if (cepNumbers.length !== 8) {
        errors.push({
          field: 'endereco.cep',
          message: 'CEP deve ter 8 dígitos',
          value: endereco.cep
        });
      }
    }
  }

  return errors;
}

function validateEmpresaData(empresa: any): ValidationError[] {
  const errors: ValidationError[] = [];

  if (empresa.cnpj && typeof empresa.cnpj !== 'string') {
    errors.push({
      field: 'entidade_juridica.cnpj',
      message: 'CNPJ deve ser uma string',
      value: empresa.cnpj
    });
  } else if (empresa.cnpj) {
    const cnpjNumbers = empresa.cnpj.replace(/\D/g, '');
    if (cnpjNumbers.length !== 14 && cnpjNumbers.length !== 0) {
      errors.push({
        field: 'entidade_juridica.cnpj',
        message: 'CNPJ deve ter 14 dígitos ou ser vazio',
        value: empresa.cnpj
      });
    }
  }

  return errors;
}

/**
 * Verifica se o token está válido
 */
export function validateToken(): { isValid: boolean; error?: string } {
  const token = localStorage.getItem('access_token');
  
  if (!token) {
    return { isValid: false, error: 'Token não encontrado' };
  }

  try {
    // Decodifica o JWT (apenas para verificar formato, não validação de segurança)
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Date.now() / 1000;
    
    if (payload.exp && payload.exp < now) {
      return { isValid: false, error: 'Token expirado' };
    }
    
    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: 'Token malformado' };
  }
}

/**
 * Função para debug de dados antes do envio
 */
export function debugApiCall(endpoint: string, data: any, method: string = 'POST') {
  console.group(`🐛 Debug API Call: ${method} ${endpoint}`);
  
  // Validação de token
  const tokenValidation = validateToken();
  console.log('🔐 Token Status:', tokenValidation);
  
  // Validação de dados (se for cliente)
  if (endpoint.includes('clientes')) {
    const validation = validateClienteData(data);
    console.log('📋 Validação de Dados:', validation);
    
    if (!validation.isValid) {
      console.error('❌ Dados inválidos:', validation.errors);
    }
    
    if (validation.warnings.length > 0) {
      console.warn('⚠️ Avisos:', validation.warnings);
    }
  }
  
  // Headers que serão enviados
  const headers: any = {
    'Content-Type': 'application/json'
  };
  
  if (tokenValidation.isValid) {
    headers.Authorization = `Bearer ${localStorage.getItem('access_token')}`;
  }
  
  console.log('📤 Headers:', headers);
  console.log('📤 Dados a enviar:', data);
  
  console.groupEnd();
}