/**
 * Utilitários para validação de dados
 */

// ✅ NOVO: Validação de CNPJ
export const validarCNPJ = (cnpj: string): boolean => {
    if (!cnpj) return false;

    // Remove formatação
    const cnpjLimpo = cnpj.replace(/[^\d]/g, '');

    // Verifica se tem 14 dígitos
    if (cnpjLimpo.length !== 14) return false;

    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1+$/.test(cnpjLimpo)) return false;

    // Validação do primeiro dígito verificador
    let soma = 0;
    let peso = 5;
    for (let i = 0; i < 12; i++) {
        soma += parseInt(cnpjLimpo[i]) * peso;
        peso = peso === 2 ? 9 : peso - 1;
    }
    let resto = soma % 11;
    let dv1 = resto < 2 ? 0 : 11 - resto;

    if (parseInt(cnpjLimpo[12]) !== dv1) return false;

    // Validação do segundo dígito verificador
    soma = 0;
    peso = 6;
    for (let i = 0; i < 13; i++) {
        soma += parseInt(cnpjLimpo[i]) * peso;
        peso = peso === 2 ? 9 : peso - 1;
    }
    resto = soma % 11;
    let dv2 = resto < 2 ? 0 : 11 - resto;

    return parseInt(cnpjLimpo[13]) === dv2;
};

// ✅ NOVO: Validação de CPF
export const validarCPF = (cpf: string): boolean => {
    if (!cpf) return false;

    // Remove formatação
    const cpfLimpo = cpf.replace(/[^\d]/g, '');

    // Verifica se tem 11 dígitos
    if (cpfLimpo.length !== 11) return false;

    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1+$/.test(cpfLimpo)) return false;

    // Validação do primeiro dígito verificador
    let soma = 0;
    for (let i = 0; i < 9; i++) {
        soma += parseInt(cpfLimpo[i]) * (10 - i);
    }
    let resto = soma % 11;
    let dv1 = resto < 2 ? 0 : 11 - resto;

    if (parseInt(cpfLimpo[9]) !== dv1) return false;

    // Validação do segundo dígito verificador
    soma = 0;
    for (let i = 0; i < 10; i++) {
        soma += parseInt(cpfLimpo[i]) * (11 - i);
    }
    resto = soma % 11;
    let dv2 = resto < 2 ? 0 : 11 - resto;

    return parseInt(cpfLimpo[10]) === dv2;
};

// ✅ NOVO: Validação de documento (CPF ou CNPJ)
export const validarDocumento = (documento: string): { valido: boolean; tipo: 'CPF' | 'CNPJ' | 'INVALIDO' } => {
    if (!documento) return { valido: false, tipo: 'INVALIDO' };

    const documentoLimpo = documento.replace(/[^\d]/g, '');

    if (documentoLimpo.length === 11) {
        return { valido: validarCPF(documento), tipo: 'CPF' };
    }

    if (documentoLimpo.length === 14) {
        return { valido: validarCNPJ(documento), tipo: 'CNPJ' };
    }

    return { valido: false, tipo: 'INVALIDO' };
};

// ✅ NOVO: Validação de email
export const validarEmail = (email: string): boolean => {
    if (!email) return false;
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
};

// ✅ NOVO: Validação de telefone
export const validarTelefone = (telefone: string): boolean => {
    if (!telefone) return false;
    const telefoneLimpo = telefone.replace(/[^\d]/g, '');
    return telefoneLimpo.length >= 10 && telefoneLimpo.length <= 11;
};

// ✅ NOVO: Validação de cliente
export const validarCliente = (cliente: any): { valido: boolean; erros: string[] } => {
    const erros: string[] = [];

    // Validar nome
    if (!cliente?.nome || cliente.nome.trim().length < 2) {
        erros.push('Nome é obrigatório e deve ter pelo menos 2 caracteres');
    }

    // Validar CPF
    if (!cliente?.cpf || !validarCPF(cliente.cpf)) {
        erros.push('CPF é obrigatório e deve ser válido');
    }

    // Validar email se fornecido
    if (cliente?.email && !validarEmail(cliente.email)) {
        erros.push('Email deve ter um formato válido');
    }

    // Validar telefone se fornecido
    if (cliente?.telefone && !validarTelefone(cliente.telefone)) {
        erros.push('Telefone deve ter um formato válido');
    }

    // Validar entidades jurídicas se for PJ
    if (cliente?.is_pessoa_juridica || cliente?.tipo_cliente === 'PJ') {
        if (!cliente?.entidades_juridicas || cliente.entidades_juridicas.length === 0) {
            erros.push('Cliente PJ deve ter pelo menos uma entidade jurídica');
        } else {
            // Validar primeira entidade jurídica
            const empresa = cliente.entidades_juridicas[0];
            if (!empresa?.razao_social || empresa.razao_social.trim().length < 2) {
                erros.push('Razão social é obrigatória para cliente PJ');
            }
            if (empresa?.cnpj && !validarCNPJ(empresa.cnpj)) {
                erros.push('CNPJ deve ser válido');
            }
        }
    }

    return {
        valido: erros.length === 0,
        erros
    };
};
