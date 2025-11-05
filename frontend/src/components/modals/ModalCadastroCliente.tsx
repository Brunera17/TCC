import { useEffect, useState } from 'react';
import { X, User, Building, Check, AlertCircle, MapPin } from 'lucide-react';
import { apiService } from '../../lib/api';
import type { Cliente } from '../../types';
import { useToast } from '../../context/ToastContext';
import { validateClienteData, debugApiCall } from '../../utils/data-validation';

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

interface EntidadeJuridicaForm {
  nome: string;
  cnpj: string;
  tipo: string;
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
  empresa?: Partial<Record<keyof EntidadeJuridicaForm, string>>;
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

const TIPOS_EMPRESA = ['LTDA', 'ME', 'EIRELI', 'S/A', 'EPP', 'OSCIP', 'ONG'];

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

const createInitialFormData = (): ClienteCompleto => ({
  cliente: { nome: '', cpf: '', email: '', telefone: '', abertura_empresa: false },
  endereco: null,
  empresa: null
});

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

  useEffect(() => {
    if (!isOpen) {
  setFormData(createInitialFormData());
  setErrors({});
  setAbaAtiva('cliente');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let ativo = true;

    const carregarDados = async () => {
      if (!clienteParaEditar) {
        setFormData(createInitialFormData());
        return;
      }

      try {
        const clienteCompleto = await apiService.getCliente(clienteParaEditar.id);

        if (!ativo) return;

        const enderecoPrincipal = clienteCompleto.enderecos && clienteCompleto.enderecos.length > 0
          ? clienteCompleto.enderecos[0]
          : null;

        const logradouroNormalizado = enderecoPrincipal?.logradouro || enderecoPrincipal?.rua || '';

        setFormData({
          cliente: {
            nome: clienteCompleto.nome,
            cpf: aplicarMascaraCPF(clienteCompleto.cpf),
            email: clienteCompleto.email || '',
            telefone: clienteCompleto.telefone || '',
            abertura_empresa: false
          },
          endereco:
            enderecoPrincipal
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
          empresa:
            clienteCompleto.entidades_juridicas && clienteCompleto.entidades_juridicas.length > 0
              ? {
                  nome: clienteCompleto.entidades_juridicas[0].nome,
                  cnpj: aplicarMascaraCNPJ(clienteCompleto.entidades_juridicas[0].cnpj),
                  tipo: clienteCompleto.entidades_juridicas[0].tipo
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

    return () => {
      ativo = false;
    };
  }, [clienteParaEditar, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = 'hidden';

    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

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
      cep: (valor: string) => /^\d{5}-?\d{3}$/.test(valor.replace(/\D/g, '')),
      complemento: () => true
    },
    empresa: {
      nome: (valor: string) => valor.trim().length >= 3,
      cnpj: (valor: string) => validarCNPJ(valor.replace(/\D/g, '')),
      tipo: (valor: string) => TIPOS_EMPRESA.includes(valor)
    }
  } as const;

  const clearFieldError = (secao: keyof FormErrors, campo: string) => {
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
          cliente: {
            ...prev.cliente,
            [campo]: valor
          }
        };
      }

      if (secao === 'endereco' && typeof valor === 'string') {
        const enderecoAtual = prev.endereco ?? createEmptyEndereco();

        if (campo === 'logradouro') {
          return {
            ...prev,
            endereco: {
              ...enderecoAtual,
              logradouro: valor,
              rua: valor
            }
          };
        }

        return {
          ...prev,
          endereco: {
            ...enderecoAtual,
            [campo]: valor
          }
        };
      }

      const empresaAtual = prev.empresa ?? {
        nome: '',
        cnpj: '',
        tipo: ''
      };

      return {
        ...prev,
        empresa: {
          ...empresaAtual,
          [campo]: valor
        }
      };
    });

    clearFieldError(secao, campo);
  };

  const validarFormulario = (): boolean => {
    const novosErros: FormErrors = {};

    if (!validacoes.cliente.nome(formData.cliente.nome)) {
      novosErros.cliente = { ...novosErros.cliente, nome: 'Nome deve ter pelo menos 3 caracteres.' };
    }
    if (formData.cliente.cpf && !validacoes.cliente.cpf(formData.cliente.cpf)) {
      novosErros.cliente = { ...novosErros.cliente, cpf: 'CPF inválido.' };
    }
    if (formData.cliente.email && !validacoes.cliente.email(formData.cliente.email)) {
      novosErros.cliente = { ...novosErros.cliente, email: 'E-mail inválido.' };
    }

    if (formData.endereco) {
      const endereco = formData.endereco;
      const camposEndereco = [
        endereco.logradouro,
        endereco.numero,
        endereco.bairro,
        endereco.cidade,
        endereco.estado,
        endereco.cep,
        endereco.complemento
      ];

      const algumCampoPreenchido = camposEndereco.some(valor => (valor ?? '').toString().trim().length > 0);

      if (algumCampoPreenchido) {
        if (!validacoes.endereco.logradouro(endereco.logradouro)) {
          novosErros.endereco = {
            ...novosErros.endereco,
            logradouro: 'Logradouro deve ter pelo menos 3 caracteres.'
          };
        }
        if (!validacoes.endereco.numero(endereco.numero)) {
          novosErros.endereco = { ...novosErros.endereco, numero: 'Número é obrigatório.' };
        }
        if (!validacoes.endereco.bairro(endereco.bairro)) {
          novosErros.endereco = { ...novosErros.endereco, bairro: 'Bairro deve ter pelo menos 2 caracteres.' };
        }
        if (!validacoes.endereco.cidade(endereco.cidade)) {
          novosErros.endereco = { ...novosErros.endereco, cidade: 'Cidade deve ter pelo menos 2 caracteres.' };
        }
        if (!validacoes.endereco.estado(endereco.estado)) {
          novosErros.endereco = { ...novosErros.endereco, estado: 'Estado deve ter 2 caracteres.' };
        }
        if (!validacoes.endereco.cep(endereco.cep)) {
          novosErros.endereco = { ...novosErros.endereco, cep: 'CEP inválido.' };
        }
      }
    }

    if (
      formData.empresa &&
      (formData.empresa.nome || formData.empresa.cnpj || formData.empresa.tipo)
    ) {
      if (formData.empresa.nome && !validacoes.empresa.nome(formData.empresa.nome)) {
        novosErros.empresa = { ...novosErros.empresa, nome: 'Nome da empresa deve ter pelo menos 3 caracteres.' };
      }
      if (formData.empresa.cnpj && !validacoes.empresa.cnpj(formData.empresa.cnpj)) {
        novosErros.empresa = { ...novosErros.empresa, cnpj: 'CNPJ inválido.' };
      }
      if (formData.empresa.tipo && !validacoes.empresa.tipo(formData.empresa.tipo)) {
        novosErros.empresa = { ...novosErros.empresa, tipo: 'Tipo de empresa inválido.' };
      }
    }

    setErrors(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const handleSalvar = async () => {
    if (!validarFormulario()) {
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
          formData.empresa && (formData.empresa.nome || formData.empresa.cnpj || formData.empresa.tipo)
            ? {
                nome: formData.empresa.nome || '',
                cnpj: formData.empresa.cnpj ? formData.empresa.cnpj.replace(/\D/g, '') : '',
                tipo: formData.empresa.tipo || ''
              }
            : undefined
      };

      const isAberturaEmpresa = formData.cliente.abertura_empresa;

      debugApiCall(
        clienteParaEditar ? `/clientes/${clienteParaEditar.id}` : '/clientes/',
        dadosParaEnviar,
        clienteParaEditar ? 'PUT' : 'POST'
      );

      const validation = validateClienteData(dadosParaEnviar);

      if (!validation.isValid) {
        const errorMessages = validation.errors.map(erro => `${erro.field}: ${erro.message}`).join('\n');
        showError('Dados inválidos', `Por favor, corrija os seguintes erros:\n${errorMessages}`);
        return;
      }

      if (validation.warnings.length > 0) {
        console.warn('Avisos de validação:', validation.warnings);
      }

      const payload = validation.sanitizedData as typeof dadosParaEnviar;
      const response = (await (clienteParaEditar
        ? apiService.updateCliente(clienteParaEditar.id, payload)
        : apiService.createCliente(payload))) as Cliente;


      const sucessoTitulo = clienteParaEditar
        ? 'Cliente atualizado com sucesso!'
        : 'Cliente cadastrado com sucesso!';
      const sucessoMensagem = clienteParaEditar
        ? 'As informações do cliente foram atualizadas corretamente.'
        : 'Os dados do cliente foram salvos.';

      if (isAberturaEmpresa && !clienteParaEditar) {
        showSuccess(
          sucessoTitulo,
          'Serviço de abertura de empresa será adicionado automaticamente.'
        );
      } else {
        showSuccess(sucessoTitulo, sucessoMensagem);
      }

      onClienteCadastrado(response);
      onClose();
    } catch (erroDesconhecido) {
      const mensagemErro =
        erroDesconhecido instanceof Error ? erroDesconhecido.message : 'Erro desconhecido.';
      showError(
        'Erro ao cadastrar cliente',
        `Erro ao ${clienteParaEditar ? 'atualizar' : 'cadastrar'} cliente: ${mensagemErro}`
      );
    } finally {
      setLoading(false);
    }
  };

  const podeIrParaEmpresa = !formData.cliente.abertura_empresa;

  const podeSalvar = (): boolean => {
    if (!formData.cliente.nome.trim()) {
      return false;
    }

    if (formData.endereco) {
      const endereco = formData.endereco;
      const camposEndereco = [
        endereco.logradouro,
        endereco.numero,
        endereco.bairro,
        endereco.cidade,
        endereco.estado,
        endereco.cep,
        endereco.complemento
      ];

      const algumCampoPreenchido = camposEndereco.some(valor => (valor ?? '').toString().trim().length > 0);

      if (algumCampoPreenchido) {
        const logradouroValido = endereco.logradouro?.trim();
        const numeroValido = endereco.numero?.trim();
        const bairroValido = endereco.bairro?.trim();
        const cidadeValida = endereco.cidade?.trim();
        const estadoValido = endereco.estado?.trim();
        const cepValido = endereco.cep?.replace(/\D/g, '');

        if (
          !logradouroValido ||
          !numeroValido ||
          !bairroValido ||
          !cidadeValida ||
          !estadoValido ||
          estadoValido.length !== 2 ||
          !cepValido ||
          cepValido.length !== 8
        ) {
          return false;
        }
      }
    }

    if (
      formData.empresa &&
      (formData.empresa.nome || formData.empresa.cnpj || formData.empresa.tipo)
    ) {
      if (!formData.empresa.nome || !formData.empresa.cnpj || !formData.empresa.tipo) {
        return false;
      }
    }

    return true;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-xl bg-gray-100 shadow-xl">
        <div className="flex max-h-[90vh] flex-col">
          <div className="flex items-center justify-between border-b border-gray-200 bg-gray-100 px-6 py-5">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {clienteParaEditar ? 'Editar Cliente' : 'Cadastrar Novo Cliente'}
              </h2>
              <p className="text-sm text-gray-500">
                {clienteParaEditar ? 'Atualize os dados do cliente.' : 'Preencha as informações do novo cliente.'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 transition-colors hover:text-gray-600"
              aria-label="Fechar modal"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="flex border-b border-gray-200 bg-gray-100">
            <button
              type="button"
              onClick={() => setAbaAtiva('cliente')}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
                abaAtiva === 'cliente'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <User className="h-4 w-4" />
              <span>Dados do Cliente</span>
            </button>
            <button
              type="button"
              onClick={() => setAbaAtiva('endereco')}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
                abaAtiva === 'endereco'
                  ? 'border-b-2 border-blue-500 text-blue-600'
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
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
                !podeIrParaEmpresa
                  ? 'cursor-not-allowed text-gray-400'
                  : abaAtiva === 'empresa'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Building className="h-4 w-4" />
              <span>Empresa</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto bg-gray-100 px-6 py-6">
            {abaAtiva === 'cliente' && (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Nome Completo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.cliente.nome}
                    onChange={event => handleInputChange('cliente', 'nome', event.target.value)}
                    className={`w-full rounded-lg border px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 ${
                      errors.cliente?.nome ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Digite o nome completo"
                  />
                  {errors.cliente?.nome && (
                    <p className="mt-1 flex items-center text-sm text-red-600">
                      <AlertCircle className="mr-1 h-4 w-4" />
                      {errors.cliente.nome}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">CPF</label>
                  <input
                    type="text"
                    value={formData.cliente.cpf || ''}
                    onChange={event => {
                      const mascara = aplicarMascaraCPF(event.target.value);
                      if (mascara.length <= 14) {
                        handleInputChange('cliente', 'cpf', mascara);
                      }
                    }}
                    className={`w-full rounded-lg border px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 ${
                      errors.cliente?.cpf ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="000.000.000-00 (opcional)"
                    maxLength={14}
                  />
                  {errors.cliente?.cpf && (
                    <p className="mt-1 flex items-center text-sm text-red-600">
                      <AlertCircle className="mr-1 h-4 w-4" />
                      {errors.cliente.cpf}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">E-mail</label>
                  <input
                    type="email"
                    value={formData.cliente.email || ''}
                    onChange={event => handleInputChange('cliente', 'email', event.target.value)}
                    className={`w-full rounded-lg border px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 ${
                      errors.cliente?.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="exemplo@email.com"
                  />
                  {errors.cliente?.email && (
                    <p className="mt-1 flex items-center text-sm text-red-600">
                      <AlertCircle className="mr-1 h-4 w-4" />
                      {errors.cliente.email}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Telefone</label>
                  <input
                    type="tel"
                    value={formData.cliente.telefone || ''}
                    onChange={event => handleInputChange('cliente', 'telefone', event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    placeholder="(11) 99999-9999"
                  />
                </div>

                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={formData.cliente.abertura_empresa}
                    onChange={event => {
                      const isAberturaEmpresa = event.target.checked;
                      handleInputChange('cliente', 'abertura_empresa', isAberturaEmpresa);

                      if (isAberturaEmpresa) {
                        setFormData(prev => ({
                          ...prev,
                          empresa: null
                        }));
                        setAbaAtiva(atual => (atual === 'empresa' ? 'cliente' : atual));
                      }
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Este cliente é para abertura de empresa
                </label>
              </div>
            )}

            {abaAtiva === 'endereco' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="endereco-logradouro" className="mb-1 block text-sm font-medium text-gray-700">
                      Logradouro <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="endereco-logradouro"
                      type="text"
                      value={formData.endereco?.logradouro ?? ''}
                      onChange={event => handleInputChange('endereco', 'logradouro', event.target.value)}
                      className={`w-full rounded-lg border px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 ${
                        errors.endereco?.logradouro ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Nome da rua ou avenida"
                    />
                    {errors.endereco?.logradouro && (
                      <p className="mt-1 flex items-center text-sm text-red-600">
                        <AlertCircle className="mr-1 h-4 w-4" />
                        {errors.endereco.logradouro}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="endereco-numero" className="mb-1 block text-sm font-medium text-gray-700">
                      Número <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="endereco-numero"
                      type="text"
                      value={formData.endereco?.numero ?? ''}
                      onChange={event => handleInputChange('endereco', 'numero', event.target.value)}
                      className={`w-full rounded-lg border px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 ${
                        errors.endereco?.numero ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="123"
                    />
                    {errors.endereco?.numero && (
                      <p className="mt-1 flex items-center text-sm text-red-600">
                        <AlertCircle className="mr-1 h-4 w-4" />
                        {errors.endereco.numero}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="endereco-bairro" className="mb-1 block text-sm font-medium text-gray-700">
                      Bairro <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="endereco-bairro"
                      type="text"
                      value={formData.endereco?.bairro ?? ''}
                      onChange={event => handleInputChange('endereco', 'bairro', event.target.value)}
                      className={`w-full rounded-lg border px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 ${
                        errors.endereco?.bairro ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Nome do bairro"
                    />
                    {errors.endereco?.bairro && (
                      <p className="mt-1 flex items-center text-sm text-red-600">
                        <AlertCircle className="mr-1 h-4 w-4" />
                        {errors.endereco.bairro}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="endereco-complemento" className="mb-1 block text-sm font-medium text-gray-700">
                      Complemento
                    </label>
                    <input
                      id="endereco-complemento"
                      type="text"
                      value={formData.endereco?.complemento ?? ''}
                      onChange={event => handleInputChange('endereco', 'complemento', event.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                      placeholder="Apartamento, bloco, referência..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="endereco-cidade" className="mb-1 block text-sm font-medium text-gray-700">
                      Cidade <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="endereco-cidade"
                      type="text"
                      value={formData.endereco?.cidade ?? ''}
                      onChange={event => handleInputChange('endereco', 'cidade', event.target.value)}
                      className={`w-full rounded-lg border px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 ${
                        errors.endereco?.cidade ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Nome da cidade"
                    />
                    {errors.endereco?.cidade && (
                      <p className="mt-1 flex items-center text-sm text-red-600">
                        <AlertCircle className="mr-1 h-4 w-4" />
                        {errors.endereco.cidade}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="endereco-estado" className="mb-1 block text-sm font-medium text-gray-700">
                      Estado <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="endereco-estado"
                      value={formData.endereco?.estado ?? ''}
                      onChange={event => handleInputChange('endereco', 'estado', event.target.value)}
                      className={`w-full rounded-lg border px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 ${
                        errors.endereco?.estado ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Selecione o estado</option>
                      {ESTADOS_BRASIL.map(estado => (
                        <option key={estado} value={estado}>
                          {estado}
                        </option>
                      ))}
                    </select>
                    {errors.endereco?.estado && (
                      <p className="mt-1 flex items-center text-sm text-red-600">
                        <AlertCircle className="mr-1 h-4 w-4" />
                        {errors.endereco.estado}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="endereco-cep" className="mb-1 block text-sm font-medium text-gray-700">
                    CEP <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="endereco-cep"
                    type="text"
                    value={formData.endereco?.cep ?? ''}
                    onChange={event => {
                      const mascara = aplicarMascaraCEP(event.target.value);
                      if (mascara.length <= 9) {
                        handleInputChange('endereco', 'cep', mascara);
                      }
                    }}
                    className={`w-full rounded-lg border px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 ${
                      errors.endereco?.cep ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="00000-000"
                    maxLength={9}
                  />
                  {errors.endereco?.cep && (
                    <p className="mt-1 flex items-center text-sm text-red-600">
                      <AlertCircle className="mr-1 h-4 w-4" />
                      {errors.endereco.cep}
                    </p>
                  )}
                </div>
              </div>
            )}

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
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Nome da Empresa <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.empresa?.nome || ''}
                        onChange={event => handleInputChange('empresa', 'nome', event.target.value)}
                        className={`w-full rounded-lg border px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 ${
                          errors.empresa?.nome ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Nome da empresa"
                      />
                      {errors.empresa?.nome && (
                        <p className="mt-1 flex items-center text-sm text-red-600">
                          <AlertCircle className="mr-1 h-4 w-4" />
                          {errors.empresa.nome}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="empresa-cnpj">
                        CNPJ <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="empresa-cnpj"
                        type="text"
                        value={formData.empresa?.cnpj || ''}
                        onChange={event => {
                          const mascara = aplicarMascaraCNPJ(event.target.value);
                          if (mascara.length <= 18) {
                            handleInputChange('empresa', 'cnpj', mascara);
                          }
                        }}
                        className={`w-full rounded-lg border px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 ${
                          errors.empresa?.cnpj ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="00.000.000/0000-00"
                        maxLength={18}
                      />
                      {errors.empresa?.cnpj && (
                        <p className="mt-1 flex items-center text-sm text-red-600">
                          <AlertCircle className="mr-1 h-4 w-4" />
                          {errors.empresa.cnpj}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="empresa-tipo">
                        Tipo de Empresa <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="empresa-tipo"
                        value={formData.empresa?.tipo || ''}
                        onChange={event => handleInputChange('empresa', 'tipo', event.target.value)}
                        className={`w-full rounded-lg border px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 ${
                          errors.empresa?.tipo ? 'border-red-500' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Selecione o tipo</option>
                        {TIPOS_EMPRESA.map(tipo => (
                          <option key={tipo} value={tipo}>
                            {tipo}
                          </option>
                        ))}
                      </select>
                      {errors.empresa?.tipo && (
                        <p className="mt-1 flex items-center text-sm text-red-600">
                          <AlertCircle className="mr-1 h-4 w-4" />
                          {errors.empresa.tipo}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-100 px-6 py-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSalvar}
              disabled={loading || !podeSalvar()}
              className="flex items-center gap-2 rounded-lg bg-custom-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-custom-blue-light disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>{clienteParaEditar ? 'Atualizar Cliente' : 'Salvar Cliente'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
