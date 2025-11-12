import { useEffect, useState, useRef } from 'react';
// Array de tipos de empresa para o select
const tiposEmpresa = [
  { id: 'LTDA', nome: 'LTDA' }, // Corrigido: 'ME' -> 'LTDA'
  { id: 'ME', nome: 'ME' },
  { id: 'EIRELI', nome: 'EIRELI' },
  { id: 'S/A', nome: 'S/A' },
  { id: 'EPP', nome: 'EPP' },
  { id: 'OSCIP', nome: 'OSCIP' },
  { id: 'ONG', nome: 'ONG' }
];
import { User, Building, Check, AlertCircle, MapPin, Loader2 } from 'lucide-react';
import { ModalPadrao } from '../ui/ModalPadrao';
import { apiService, ApiError } from '../../lib/api';
import type { Cliente } from '../../types';
import { useToast } from '../../context/ToastContext';
import { validateClienteData, debugApiCall } from '../../utils/data-validation';
// Importar componentes de UI padronizados
import { FormField } from '../forms/FormField';
import { Input } from '../forms/Input';
import { Select } from '../forms/Select';
import { Button } from '../forms/Button';
import { ErrorMessage } from '../ui/ErrorMessage'; // Para exibir erros da API

// Interface da Empresa ATUALIZADA para corresponder ao formulário
interface EntidadeJuridicaForm {
  nome: string; // Usado internamente para nome fantasia
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  contato: string;
  status: string;
  inscricao_estadual: string;
  tipo_id: string; // Corrigido de 'tipo' para 'tipo_id'
}

interface ClienteForm {
  nome: string;
  cpf?: string;
  email?: string;
  telefone?: string;
  abertura_empresa: boolean;
}

interface EnderecoForm {
  id?: number;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  complemento?: string;
  rua?: string;
}

type Aba = 'cliente' | 'endereco' | 'empresa';

interface ClienteCompleto {
  cliente: ClienteForm;
  endereco: EnderecoForm | null;
  empresa: EntidadeJuridicaForm | null;
}

interface FormErrors {
  cliente?: Partial<Record<keyof ClienteForm, string>>;
  endereco?: Partial<Record<keyof EnderecoForm, string>>;
  empresa?: Partial<Record<keyof EntidadeJuridicaForm, string>>; // Atualizado
}

interface ModalCadastroClienteProps {
  isOpen: boolean;
  onClose: () => void;
  onClienteCadastrado: (cliente: Cliente) => void;
  clienteParaEditar?: Cliente | null;
}

const ESTADOS_BRASIL = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

// Array de strings não é mais usado, usamos o array de objetos 'tiposEmpresa'
// const TIPOS_EMPRESA = [...];

const createEmptyEndereco = (): EnderecoForm => ({
  logradouro: '',
  numero: '',
  bairro: '',
  cidade: '',
  estado: '',
  cep: '',
  complemento: '',
  rua: ''
});

// ATUALIZADO para incluir novos campos da empresa
const createEmptyEmpresa = (): EntidadeJuridicaForm => ({
  nome: '',
  cnpj: '',
  tipo_id: '',
  razao_social: '',
  nome_fantasia: '',
  contato: '',
  status: 'ativa',
  inscricao_estadual: '',
});

const createInitialFormData = (): ClienteCompleto => ({
  cliente: { nome: '', cpf: '', email: '', telefone: '', abertura_empresa: false },
  endereco: null,
  empresa: null
});

// ... (Funções de validação e máscara permanecem as mesmas) ...
const validarCPF = (cpf?: string): boolean => {
  if (!cpf) return false;
  const cpfLimpo = cpf.replace(/\D/g, '');
  if (cpfLimpo.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpfLimpo)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i += 1) {
    soma += parseInt(cpfLimpo.charAt(i), 10) * (10 - i);
  }
  let resto = 11 - (soma % 11);
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpfLimpo.charAt(9), 10)) return false;
  soma = 0;
  for (let i = 0; i < 10; i += 1) {
    soma += parseInt(cpfLimpo.charAt(i), 10) * (11 - i);
  }
  resto = 11 - (soma % 11);
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpfLimpo.charAt(10), 10)) return false;
  return true;
};
const validarCNPJ = (cnpj?: string): boolean => {
  if (!cnpj) return false;
  const cnpjLimpo = cnpj.replace(/\D/g, '');
  if (cnpjLimpo.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpjLimpo)) return false;
  let soma = 0;
  let peso = 2;
  for (let i = 11; i >= 0; i -= 1) {
    soma += parseInt(cnpjLimpo.charAt(i), 10) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  let resto = soma % 11;
  const digito1 = resto < 2 ? 0 : 11 - resto;
  if (parseInt(cnpjLimpo.charAt(12), 10) !== digito1) return false;
  soma = 0;
  peso = 2;
  for (let i = 12; i >= 0; i -= 1) {
    soma += parseInt(cnpjLimpo.charAt(i), 10) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  resto = soma % 11;
  const digito2 = resto < 2 ? 0 : 11 - resto;
  if (parseInt(cnpjLimpo.charAt(13), 10) !== digito2) return false;
  return true;
};
const validarEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
const aplicarMascaraCPF = (valor?: string): string => {
  if (!valor) return '';
  const cpfLimpo = valor.replace(/\D/g, '');
  return cpfLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};
const aplicarMascaraCNPJ = (valor?: string): string => {
  if (!valor) return '';
  const cnpjLimpo = valor.replace(/\D/g, '');
  return cnpjLimpo.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
};
const aplicarMascaraCEP = (valor: string): string => {
  const cepLimpo = valor.replace(/\D/g, '');
  return cepLimpo.replace(/(\d{5})(\d{3})/, '$1-$2');
};


export const ModalCadastroCliente: React.FC<ModalCadastroClienteProps> = ({
  isOpen,
  onClose,
  onClienteCadastrado,
  clienteParaEditar
}) => {
  const { showError, showSuccess } = useToast();
  const [abaAtiva, setAbaAtiva] = useState<Aba>('cliente');
  const [formData, setFormData] = useState<ClienteCompleto>(createInitialFormData());
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [emailChecking, setEmailChecking] = useState(false);
  const [existingClient, setExistingClient] = useState<any | null>(null);
  const emailDebounceRef = useRef<number | null>(null);
  const [apiError, setApiError] = useState(''); // Estado para erros da API no rodapé

  useEffect(() => {
    if (!isOpen) {
      setFormData(createInitialFormData());
      setErrors({});
      setAbaAtiva('cliente');
      setApiError('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    let ativo = true;

    const carregarDados = async () => {
      if (!clienteParaEditar) {
        setFormData(createInitialFormData());
        return;
      }
      try {
        const clienteCompleto = await apiService.getCliente(clienteParaEditar.id);
        if (!ativo) return;
        const enderecoPrincipal = clienteCompleto.enderecos?.[0] || null;
        const logradouroNormalizado = enderecoPrincipal?.logradouro || enderecoPrincipal?.rua || '';
        const empresaPrincipal = clienteCompleto.entidades_juridicas?.[0] || null;

        setFormData({
          cliente: {
            nome: clienteCompleto.nome,
            cpf: aplicarMascaraCPF(clienteCompleto.cpf),
            email: clienteCompleto.email || '',
            telefone: clienteCompleto.telefone || '',
            abertura_empresa: false
          },
          endereco: enderecoPrincipal
            ? {
                id: enderecoPrincipal.id,
                logradouro: logradouroNormalizado,
                numero: enderecoPrincipal.numero || '',
                bairro: enderecoPrincipal.bairro || '',
                cidade: enderecoPrincipal.cidade || '',
                estado: enderecoPrincipal.estado || '',
                cep: aplicarMascaraCEP(enderecoPrincipal.cep || ''),
                complemento: enderecoPrincipal.complemento || '',
                rua: logradouroNormalizado
              }
            : null,
          empresa: empresaPrincipal
            ? {
                nome: empresaPrincipal.nome_fantasia || empresaPrincipal.nome, // Prioriza nome_fantasia
                cnpj: aplicarMascaraCNPJ(empresaPrincipal.cnpj),
                tipo_id: (empresaPrincipal as any).tipo_id || empresaPrincipal.tipo, // Campo 'tipo' ou 'tipo_id'
                razao_social: (empresaPrincipal as any).razao_social || empresaPrincipal.nome,
                nome_fantasia: (empresaPrincipal as any).nome_fantasia || empresaPrincipal.nome,
                contato: (empresaPrincipal as any).contato || '',
                status: (empresaPrincipal as any).status || 'ativa',
                inscricao_estadual: (empresaPrincipal as any).inscricao_estadual || '',
              }
            : null
        });
      } catch (erroDesconhecido) {
        if (!ativo) return;
        console.warn('Não foi possível carregar dados completos do cliente.', erroDesconhecido);
        setFormData({
          cliente: {
            nome: clienteParaEditar.nome,
            cpf: clienteParaEditar.cpf ? aplicarMascaraCPF(clienteParaEditar.cpf) : '',
            email: clienteParaEditar.email || '',
            telefone: clienteParaEditar.telefone || '',
            abertura_empresa: false
          },
          endereco: null,
          empresa: null
        });
      }
    };
    carregarDados();
    return () => { ativo = false; };
  }, [clienteParaEditar, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = 'hidden';
    return () => { body.style.overflow = previousOverflow; };
  }, [isOpen]);

  // VALIDAÇÃO CORRIGIDA
  const validacoes = {
    cliente: {
      nome: (valor: string) => valor.trim().length >= 3,
      cpf: (valor: string) => !valor || validarCPF(valor.replace(/\D/g, '')),
      email: (valor: string) => !valor || validarEmail(valor)
    },
    endereco: {
      logradouro: (valor: string) => valor.trim().length >= 3,
      numero: (valor: string) => valor.trim().length >= 1,
      bairro: (valor: string) => valor.trim().length >= 2,
      cidade: (valor: string) => valor.trim().length >= 2,
      estado: (valor: string) => valor.trim().length === 2,
      cep: (valor: string) => /^\d{5}\d{3}$/.test(valor.replace(/\D/g, '')), // 8 dígitos puros
      complemento: () => true
    },
    empresa: {
      nome: (valor: string) => true, // 'nome' é interno, validamos nome_fantasia
      cnpj: (valor: string) => validarCNPJ(valor.replace(/\D/g, '')),
      tipo_id: (valor: string) => tiposEmpresa.some(t => t.id === valor), // Validar contra o array de objetos
      razao_social: (valor: string) => valor.trim().length >= 3,
      nome_fantasia: (valor: string) => valor.trim().length >= 3,
    }
  } as const;


  const clearFieldError = (secao: keyof FormErrors, campo: string) => {
    setApiError(''); // Limpa erro geral da API
    setErrors(prev => {
      const sectionErrors = prev[secao];
      if (!sectionErrors || sectionErrors[campo as keyof typeof sectionErrors] === undefined) {
        return prev;
      }
      const updatedSection = { ...sectionErrors } as Record<string, string | undefined>;
      delete updatedSection[campo];
      const nextErrors: FormErrors = { ...prev };
      if (Object.keys(updatedSection).length === 0) {
        delete nextErrors[secao];
      } else {
        nextErrors[secao] = updatedSection;
      }
      return nextErrors;
    });
  };

  const handleInputChange = (secao: keyof ClienteCompleto, campo: string, valor: string | boolean) => {
    setFormData(prev => {
      if (secao === 'cliente') {
        return {
          ...prev,
          cliente: { ...prev.cliente, [campo]: valor }
        };
      }
      if (secao === 'endereco') {
        const enderecoAtual = prev.endereco ?? createEmptyEndereco();
        const updatedEndereco = { ...enderecoAtual, [campo]: valor };
        if (campo === 'logradouro') {
          updatedEndereco.rua = valor as string;
        }
        return { ...prev, endereco: updatedEndereco };
      }
      // Seção 'empresa'
      const empresaAtual = prev.empresa ?? createEmptyEmpresa();
      const updatedEmpresa = { ...empresaAtual, [campo]: valor };
      // Sincronizar 'nome' (Nome Fantasia no form) e 'nome_fantasia'
      if (campo === 'nome_fantasia') {
          updatedEmpresa.nome = valor as string;
      } else if (campo === 'nome') {
          updatedEmpresa.nome_fantasia = valor as string;
      }
      return { ...prev, empresa: updatedEmpresa };
    });

    clearFieldError(secao, campo);
    
    if (secao === 'cliente' && campo === 'email') {
      setExistingClient(null);
      if (emailDebounceRef.current) {
        window.clearTimeout(emailDebounceRef.current);
      }
      const emailValor = String(valor || '').trim();
      if (emailValor && validarEmail(emailValor)) {
        emailDebounceRef.current = window.setTimeout(async () => {
          setEmailChecking(true);
          try {
            // Não bloquear edição se o email for o do próprio cliente
            if(clienteParaEditar && clienteParaEditar.email === emailValor) {
              return;
            }
            // API atualmente retorna clientes ativos; verificar duplicatas ativas
            const response = await apiService.getClientes({ email: emailValor, per_page: 1 });
            const clientes = response.data || response;
            const encontrado = Array.isArray(clientes) ? clientes.find((c: any) => (c.email || '').toLowerCase() === emailValor.toLowerCase()) : null;
            
            if (encontrado) {
              setExistingClient(encontrado);
              setErrors(prev => ({
                ...prev,
                cliente: { ...(prev.cliente || {}), email: 'E-mail já cadastrado.' }
              }));
            } else {
              setExistingClient(null);
              // Limpa apenas o erro de email
              clearFieldError('cliente', 'email');
            }
          } catch (err) {
            console.warn('Erro ao verificar e-mail:', err);
          } finally {
            setEmailChecking(false);
          }
        }, 600);
      }
    }
  };

  // VALIDAÇÃO FORMULÁRIO ATUALIZADA
  const validarFormulario = (): boolean => {
    const novosErros: FormErrors = {};

    // Cliente
    if (!validacoes.cliente.nome(formData.cliente.nome)) {
      novosErros.cliente = { ...novosErros.cliente, nome: 'Nome deve ter pelo menos 3 caracteres.' };
    }
    if (formData.cliente.cpf && !validacoes.cliente.cpf(formData.cliente.cpf)) {
      novosErros.cliente = { ...novosErros.cliente, cpf: 'CPF inválido.' };
    }
    if (formData.cliente.email && !validacoes.cliente.email(formData.cliente.email)) {
      novosErros.cliente = { ...novosErros.cliente, email: 'E-mail inválido.' };
    }
    // Adicionar erro de email existente se houver
    if (errors.cliente?.email) {
       novosErros.cliente = { ...novosErros.cliente, email: errors.cliente.email };
    }

    // Endereço (só valida se algum campo foi preenchido)
    if (formData.endereco) {
      const endereco = formData.endereco;
      const camposEndereco = [endereco.logradouro, endereco.numero, endereco.bairro, endereco.cidade, endereco.estado, endereco.cep];
      const algumCampoPreenchido = camposEndereco.some(valor => (valor ?? '').toString().trim().length > 0);

      if (algumCampoPreenchido) {
        if (!validacoes.endereco.logradouro(endereco.logradouro)) novosErros.endereco = { ...novosErros.endereco, logradouro: 'Logradouro inválido.' };
        if (!validacoes.endereco.numero(endereco.numero)) novosErros.endereco = { ...novosErros.endereco, numero: 'Número é obrigatório.' };
        if (!validacoes.endereco.bairro(endereco.bairro)) novosErros.endereco = { ...novosErros.endereco, bairro: 'Bairro inválido.' };
        if (!validacoes.endereco.cidade(endereco.cidade)) novosErros.endereco = { ...novosErros.endereco, cidade: 'Cidade inválida.' };
        if (!validacoes.endereco.estado(endereco.estado)) novosErros.endereco = { ...novosErros.endereco, estado: 'Estado inválido.' };
        if (!validacoes.endereco.cep(endereco.cep)) novosErros.endereco = { ...novosErros.endereco, cep: 'CEP inválido.' };
      }
    }

    // Empresa (só valida se algum campo foi preenchido)
    if (formData.empresa) {
        const empresa = formData.empresa;
        const camposEmpresa = [empresa.razao_social, empresa.nome_fantasia, empresa.cnpj, empresa.tipo_id];
        const algumCampoPreenchido = camposEmpresa.some(valor => (valor ?? '').toString().trim().length > 0);

        if (algumCampoPreenchido) {
            // Se algum campo da empresa for preenchido, os principais são obrigatórios
            if (!validacoes.empresa.razao_social(empresa.razao_social)) novosErros.empresa = { ...novosErros.empresa, razao_social: 'Razão Social inválida.' };
            if (!validacoes.empresa.nome_fantasia(empresa.nome_fantasia)) novosErros.empresa = { ...novosErros.empresa, nome_fantasia: 'Nome Fantasia inválido.' };
            if (!validacoes.empresa.cnpj(empresa.cnpj)) novosErros.empresa = { ...novosErros.empresa, cnpj: 'CNPJ inválido.' };
            if (!validacoes.empresa.tipo_id(empresa.tipo_id)) novosErros.empresa = { ...novosErros.empresa, tipo_id: 'Tipo de empresa inválido.' };
            
            // Sincronizar nome e nome_fantasia (nome é usado internamente para nome_fantasia)
            if (!novosErros.empresa?.nome_fantasia) {
                formData.empresa.nome = empresa.nome_fantasia;
            }
        }
    }

    setErrors(novosErros);
    return Object.keys(novosErros).length === 0;
  };


  // handleSalvar ATUALIZADO
  const handleSalvar = async () => {
    setApiError(''); // Limpa erro da API
    if (!validarFormulario()) {
      showError("Erro de Validação", "Por favor, corrija os campos marcados.");
      return;
    }

    setLoading(true);
    try {
      const dadosParaEnviar = {
        nome: formData.cliente.nome,
        cpf: formData.cliente.cpf ? formData.cliente.cpf.replace(/\D/g, '') : undefined,
        email: formData.cliente.email || undefined,
        telefone: formData.cliente.telefone || undefined,
        endereco:
          formData.endereco && formData.endereco.logradouro.trim()
            ? {
                ...(formData.endereco.id ? { id: formData.endereco.id } : {}),
                logradouro: formData.endereco.logradouro.trim(),
                numero: formData.endereco.numero.trim(),
                bairro: formData.endereco.bairro.trim(),
                cidade: formData.endereco.cidade.trim(),
                estado: formData.endereco.estado.trim().toUpperCase(),
                cep: formData.endereco.cep.replace(/\D/g, ''),
                complemento: formData.endereco.complemento?.trim() || undefined
              }
            : undefined,
        entidade_juridica:
          formData.empresa && formData.empresa.razao_social && formData.empresa.cnpj
            ? {
                nome: formData.empresa.nome_fantasia, // 'nome' no backend é 'nome_fantasia'
                cnpj: formData.empresa.cnpj.replace(/\D/g, ''),
                tipo: formData.empresa.tipo_id, // 'tipo' no backend é o ID
                razao_social: formData.empresa.razao_social,
                nome_fantasia: formData.empresa.nome_fantasia,
                contato: formData.empresa.contato || undefined,
                status: formData.empresa.status || 'ativa',
                inscricao_estadual: formData.empresa.inscricao_estadual || undefined,
              }
            : undefined
      };

      const isAberturaEmpresa = formData.cliente.abertura_empresa;
      debugApiCall(clienteParaEditar ? `/clientes/${clienteParaEditar.id}` : '/clientes/', dadosParaEnviar, clienteParaEditar ? 'PUT' : 'POST');
      
      const validation = validateClienteData(dadosParaEnviar);
      if (!validation.isValid) {
        const errorMessages = validation.errors.map(erro => `${erro.field}: ${erro.message}`).join('\n');
        setApiError(errorMessages); // Mostra no rodapé
        setLoading(false);
        return;
      }

      const payload = validation.sanitizedData as typeof dadosParaEnviar;
      const response = (await (clienteParaEditar
        ? apiService.updateCliente(clienteParaEditar.id, payload)
        : apiService.createCliente(payload))) as Cliente;

      const sucessoTitulo = clienteParaEditar ? 'Cliente atualizado!' : 'Cliente cadastrado!';
      const sucessoMensagem = clienteParaEditar ? 'Os dados foram atualizados.' : 'O cliente foi salvo.';
      
      if (isAberturaEmpresa && !clienteParaEditar) {
        showSuccess(sucessoTitulo, 'Serviço de abertura de empresa será adicionado automaticamente.');
      } else {
        showSuccess(sucessoTitulo, sucessoMensagem);
      }

      onClienteCadastrado(response);
      onClose();
    } catch (erroDesconhecido) {
      if (erroDesconhecido instanceof ApiError) {
        const status = erroDesconhecido.status;
        const details = erroDesconhecido.details;
        const detailMsg = typeof details === 'string' ? details : (details?.error ?? details?.message ?? '');
        if ((status === 400 || status === 409) && detailMsg && detailMsg.toString().toLowerCase().includes('e-mail')) {
          setErrors(prev => ({
            ...prev,
            cliente: { ...(prev.cliente || {}), email: 'E-mail já cadastrado.' }
          }));
          setApiError('E-mail já cadastrado.');
          setLoading(false);
          return;
        }
        setApiError(`Erro ${status}: ${detailMsg || 'Erro no servidor.'}`);
      } else {
        const mensagemErro = erroDesconhecido instanceof Error ? erroDesconhecido.message : 'Erro desconhecido.';
        setApiError(`Erro: ${mensagemErro}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const podeIrParaEmpresa = !formData.cliente.abertura_empresa;

  // podeSalvar ATUALIZADO
  const podeSalvar = (): boolean => {
    if (!formData.cliente.nome.trim()) return false;
    if (emailChecking) return false;
    if (errors.cliente?.email) return false;

    if (formData.endereco) {
      const endereco = formData.endereco;
      const camposEndereco = [endereco.logradouro, endereco.numero, endereco.bairro, endereco.cidade, endereco.estado, endereco.cep];
      const algumCampoPreenchido = camposEndereco.some(valor => (valor ?? '').toString().trim().length > 0);
      if (algumCampoPreenchido) {
        const { logradouro, numero, bairro, cidade, estado, cep } = validacoes.endereco;
        if (
          !logradouro(endereco.logradouro) ||
          !numero(endereco.numero) ||
          !bairro(endereco.bairro) ||
          !cidade(endereco.cidade) ||
          !estado(endereco.estado) ||
          !cep(endereco.cep)
        ) return false;
      }
    }
    if (formData.empresa) {
        const empresa = formData.empresa;
        const camposEmpresa = [empresa.razao_social, empresa.nome_fantasia, empresa.cnpj, empresa.tipo_id];
        const algumCampoPreenchido = camposEmpresa.some(valor => (valor ?? '').toString().trim().length > 0);
      if (algumCampoPreenchido) {
        const { razao_social, nome_fantasia, cnpj, tipo_id } = validacoes.empresa;
        if (
          !razao_social(empresa.razao_social) ||
          !nome_fantasia(empresa.nome_fantasia) ||
          !cnpj(empresa.cnpj) ||
          !tipo_id(empresa.tipo_id)
        ) return false;
      }
    }
    return true;
  };

  const tituloModal = clienteParaEditar ? 'Editar Cliente' : 'Cadastrar Novo Cliente';
  const descricaoModal = clienteParaEditar
    ? 'Atualize os dados do cliente.'
    : 'Preencha as informações do novo cliente.';

  if (!isOpen) return null;

  const estadosOptions = ESTADOS_BRASIL.map(uf => ({ value: uf, label: uf }));
  const tiposEmpresaOptions = tiposEmpresa.map(tipo => ({ value: tipo.id, label: tipo.nome }));

  return (
    <ModalPadrao
      isOpen={isOpen}
      onClose={onClose}
      title={tituloModal}
      size="2xl"
      showFooter={false}
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-gray-500">{descricaoModal}</p>

        <div className="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
          <div className="flex border-b border-gray-200 bg-gray-100">
            <button
              type="button"
              onClick={() => setAbaAtiva('cliente')}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${abaAtiva === 'cliente'
                  ? 'border-b-2 border-blue-500 text-blue-600 bg-white'
                  : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              <User className="h-4 w-4" />
              <span>Dados do Cliente</span>
            </button>
            <button
              type="button"
              onClick={() => setAbaAtiva('endereco')}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${abaAtiva === 'endereco'
                  ? 'border-b-2 border-blue-500 text-blue-600 bg-white'
                  : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              <MapPin className="h-4 w-4" />
              <span>Endereço</span>
            </button>
            <button
              type="button"
              onClick={() => setAbaAtiva('empresa')}
              disabled={!podeIrParaEmpresa}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${!podeIrParaEmpresa
                  ? 'cursor-not-allowed text-gray-400'
                  : abaAtiva === 'empresa'
                    ? 'border-b-2 border-blue-500 text-blue-600 bg-white'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              <Building className="h-4 w-4" />
              <span>Empresa</span>
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto px-6 py-6 bg-white">
            {/* ABA CLIENTE - LAYOUT GRID */}
            {abaAtiva === 'cliente' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField label="Nome Completo" required error={errors.cliente?.nome}>
                    <Input
                      type="text"
                      value={formData.cliente.nome}
                      onChange={event => handleInputChange('cliente', 'nome', event.target.value)}
                      placeholder="Digite o nome completo"
                    />
                  </FormField>
                  <FormField label="CPF" required error={errors.cliente?.cpf}>
                    <Input
                      type="text"
                      value={formData.cliente.cpf || ''}
                      onChange={event => {
                        const mascara = aplicarMascaraCPF(event.target.value);
                        if (mascara.length <= 14) {
                          handleInputChange('cliente', 'cpf', mascara);
                        }
                      }}
                      placeholder="000.000.000-00"
                      maxLength={14}
                    />
                  </FormField>
                  <FormField
                    label="E-mail"
                    error={errors.cliente?.email}
                    helpText={emailChecking ? "Verificando e-mail..." : (existingClient ? `E-mail já usado por ${existingClient.nome}` : undefined)}
                  >
                    <Input
                      type="email"
                      value={formData.cliente.email || ''}
                      onChange={event => handleInputChange('cliente', 'email', event.target.value)}
                      placeholder="exemplo@email.com"
                    />
                  </FormField>
                  <FormField label="Telefone">
                    <Input
                      type="tel"
                      value={formData.cliente.telefone || ''}
                      onChange={event => handleInputChange('cliente', 'telefone', event.target.value)}
                      placeholder="(11) 99999-9999"
                    />
                  </FormField>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer pt-2">
                  <input
                    type="checkbox"
                    checked={formData.cliente.abertura_empresa}
                    onChange={event => {
                      const isAberturaEmpresa = event.target.checked;
                      handleInputChange('cliente', 'abertura_empresa', isAberturaEmpresa);
                      if (isAberturaEmpresa) {
                        setFormData(prev => ({ ...prev, empresa: null }));
                        setAbaAtiva(atual => (atual === 'empresa' ? 'cliente' : atual));
                      }
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Este cliente é para abertura de empresa
                </label>
              </div>
            )}

            {/* ABA ENDEREÇO - LAYOUT GRID (Já estava correto) */}
            {abaAtiva === 'endereco' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField label="Logradouro" required={!!formData.endereco} error={errors.endereco?.logradouro}>
                    <Input
                      type="text"
                      value={formData.endereco?.logradouro ?? ''}
                      onChange={event => handleInputChange('endereco', 'logradouro', event.target.value)}
                      placeholder="Nome da rua ou avenida"
                    />
                  </FormField>
                  <FormField label="Número" required={!!formData.endereco} error={errors.endereco?.numero}>
                    <Input
                      type="text"
                      value={formData.endereco?.numero ?? ''}
                      onChange={event => handleInputChange('endereco', 'numero', event.target.value)}
                      placeholder="123"
                    />
                  </FormField>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField label="Bairro" required={!!formData.endereco} error={errors.endereco?.bairro}>
                    <Input
                      type="text"
                      value={formData.endereco?.bairro ?? ''}
                      onChange={event => handleInputChange('endereco', 'bairro', event.target.value)}
                      placeholder="Nome do bairro"
                    />
                  </FormField>
                  <FormField label="Complemento">
                    <Input
                      type="text"
                      value={formData.endereco?.complemento ?? ''}
                      onChange={event => handleInputChange('endereco', 'complemento', event.target.value)}
                      placeholder="Apartamento, bloco, referência..."
                    />
                  </FormField>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField label="Cidade" required={!!formData.endereco} error={errors.endereco?.cidade}>
                    <Input
                      type="text"
                      value={formData.endereco?.cidade ?? ''}
                      onChange={event => handleInputChange('endereco', 'cidade', event.target.value)}
                      placeholder="Nome da cidade"
                    />
                  </FormField>
                  <FormField label="Estado" required={!!formData.endereco} error={errors.endereco?.estado}>
                    <Select
                      value={formData.endereco?.estado ?? ''}
                      onChange={value => handleInputChange('endereco', 'estado', value)}
                      options={estadosOptions}
                      placeholder="Selecione o estado"
                    />
                  </FormField>
                </div>
                <FormField label="CEP" required={!!formData.endereco} error={errors.endereco?.cep}>
                  <Input
                    type="text"
                    value={formData.endereco?.cep ?? ''}
                    onChange={event => {
                      const mascara = aplicarMascaraCEP(event.target.value);
                      if (mascara.length <= 9) {
                        handleInputChange('endereco', 'cep', mascara);
                      }
                    }}
                    placeholder="00000-000"
                    maxLength={9}
                  />
                </FormField>
              </div>
            )}
            
            {/* ABA EMPRESA - LAYOUT GRID */}
            {abaAtiva === 'empresa' && (
              <div className="space-y-4">
                {formData.cliente.abertura_empresa ? (
                  <div className="py-8 text-center">
                    <Building className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                    <h3 className="mb-2 text-lg font-medium text-gray-900">Cliente para Abertura de Empresa</h3>
                    <p className="text-gray-500">
                      Este cliente é para abertura de empresa, portanto não possui dados de empresa cadastrados.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField label="Razão Social" required={!!formData.empresa} error={errors.empresa?.razao_social}>
                      <Input
                        type="text"
                        value={formData.empresa?.razao_social || ''}
                        onChange={e => handleInputChange('empresa', 'razao_social', e.target.value)}
                        placeholder="Razão Social"
                      />
                    </FormField>

                    <FormField label="Nome Fantasia" required={!!formData.empresa} error={errors.empresa?.nome_fantasia}>
                      <Input
                        type="text"
                        value={formData.empresa?.nome_fantasia || ''}
                        onChange={e => handleInputChange('empresa', 'nome_fantasia', e.target.value)}
                        placeholder="Nome Fantasia"
                      />
                    </FormField>
                    
                    <FormField label="CNPJ" required={!!formData.empresa} error={errors.empresa?.cnpj}>
                      <Input
                        type="text"
                        value={formData.empresa?.cnpj || ''}
                        onChange={event => {
                          const mascara = aplicarMascaraCNPJ(event.target.value);
                          if (mascara.length <= 18) {
                            handleInputChange('empresa', 'cnpj', mascara);
                          }
                        }}
                        placeholder="00.000.000/0000-00"
                        maxLength={18}
                      />
                    </FormField>
                    
                    <FormField label="Tipo de Empresa" required={!!formData.empresa} error={errors.empresa?.tipo_id}>
                      <Select
                        value={formData.empresa?.tipo_id || ''}
                        onChange={value => handleInputChange('empresa', 'tipo_id', value)}
                        options={tiposEmpresaOptions}
                        placeholder="Selecione o tipo"
                      />
                    </FormField>
                    
                    <FormField label="Inscrição Estadual">
                      <Input
                        type="text"
                        value={formData.empresa?.inscricao_estadual || ''}
                        onChange={e => handleInputChange('empresa', 'inscricao_estadual', e.target.value)}
                        placeholder="Inscrição Estadual"
                      />
                    </FormField>

                    <FormField label="Contato (Telefone ou E-mail)">
                      <Input
                        type="text"
                        value={formData.empresa?.contato || ''}
                        onChange={e => handleInputChange('empresa', 'contato', e.target.value)}
                        placeholder="Telefone ou e-mail"
                      />
                    </FormField>

                    <FormField label="Status">
                      <Select
                        value={formData.empresa?.status || 'ativa'}
                        onChange={e => handleInputChange('empresa', 'status', e)}
                        options={[{value: 'ativa', label: 'Ativa'}, {value: 'inativa', label: 'Inativa'}]}
                      />
                    </FormField>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Rodapé Padronizado com Botões */}
        <div className="flex items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
          <div className="flex-1 min-w-0">
            {apiError && <ErrorMessage message={apiError} onDismiss={() => setApiError('')} />}
          </div>
          <div className="flex flex-shrink-0 gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSalvar}
              loading={loading || emailChecking}
              disabled={loading || !podeSalvar() || emailChecking}
              leftIcon={<Check className="h-4 w-4" />}
            >
              {clienteParaEditar ? 'Atualizar Cliente' : 'Salvar Cliente'}
            </Button>
          </div>
        </div>
      </div>
    </ModalPadrao>
  );
};