import { useState, useEffect } from 'react';
import { X, User, Mail, Building, Shield, Check, AlertCircle } from 'lucide-react';
import { apiService } from '../../lib/api';
import type { Funcionario } from '../../types';

interface FuncionarioForm {
  id?: number;
  nome: string;
  email: string;
  senha?: string;
  gerente: boolean;
  cargo_id: number;
  empresa_id: number;
  ativo?: boolean;
}

interface Cargo {
  id: number;
  codigo: string;
  nome: string;
  nivel?: string;
  empresa_id: number;
}

interface Empresa {
  id: number;
  nome: string;
  cnpj: string;
}

interface ModalCadastroFuncionarioProps {
  isOpen: boolean;
  onClose: () => void;
  onFuncionarioCadastrado: (funcionario: Funcionario) => void;
  funcionarioParaEditar?: Funcionario | null;
}

export const ModalCadastroFuncionario: React.FC<ModalCadastroFuncionarioProps> = ({
  isOpen,
  onClose,
  onFuncionarioCadastrado,
  funcionarioParaEditar
}) => {
  const [activeTab, setActiveTab] = useState<'dados' | 'cargo'>('dados');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Estados para dados do funcionário
  const [formData, setFormData] = useState<FuncionarioForm>({
    nome: '',
    email: '',
    senha: '',
    gerente: false,
    cargo_id: 0,
    empresa_id: 0
  });

  // Estados para carregar dados
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Carregar dados necessários
  useEffect(() => {
    if (isOpen) {
      carregarDados();
    }
  }, [isOpen]);

  // Carregar dados do funcionário para edição
  useEffect(() => {
    if (funcionarioParaEditar && isOpen) {
      setFormData({
        id: funcionarioParaEditar.id,
        nome: funcionarioParaEditar.nome,
        email: funcionarioParaEditar.email,
        senha: '', // Não carregar senha para edição
        gerente: funcionarioParaEditar.gerente,
        cargo_id: funcionarioParaEditar.cargo_id,
        empresa_id: funcionarioParaEditar.empresa_id,
        ativo: funcionarioParaEditar.ativo
      });
    } else if (isOpen) {
      // Reset form para novo funcionário
      setFormData({
        nome: '',
        email: '',
        senha: '',
        gerente: false,
        cargo_id: 0,
        empresa_id: 0
      });
    }
  }, [funcionarioParaEditar, isOpen]);

  const carregarDados = async () => {
    setLoadingData(true);
    try {
      // Carregar cargos e empresas das APIs
      const [cargosRes, empresasRes] = await Promise.all([
        apiService.getCargos({ ativo: true }),
        apiService.getEmpresas({ ativo: true })
      ]);

      setCargos(cargosRes.data || []);
      setEmpresas(empresasRes.data || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setError('Erro ao carregar dados necessários');
    } finally {
      setLoadingData(false);
    }
  };

  const handleInputChange = (field: keyof FuncionarioForm, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validarFormulario = () => {
    const erros: string[] = [];

    if (!formData.nome.trim()) {
      erros.push('Nome é obrigatório');
    }

    if (!formData.email.trim()) {
      erros.push('E-mail é obrigatório');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      erros.push('E-mail inválido');
    }

    if (!funcionarioParaEditar && !formData.senha) {
      erros.push('Senha é obrigatória');
    } else if (formData.senha && formData.senha.length < 6) {
      erros.push('Senha deve ter pelo menos 6 caracteres');
    }

    if (!formData.cargo_id) {
      erros.push('Cargo é obrigatório');
    }

    if (!formData.empresa_id) {
      erros.push('Empresa é obrigatória');
    }

    return erros;
  };

  const handleSalvar = async () => {
    setError('');
    setSuccess('');

    const erros = validarFormulario();
    if (erros.length > 0) {
      setError(erros.join(', '));
      return;
    }

    setLoading(true);
    try {
      let funcionarioSalvo: Funcionario;

      if (funcionarioParaEditar) {
        // Atualizar funcionário existente
        const dadosParaEnviar = { ...formData };
        if (!dadosParaEnviar.senha) {
          delete dadosParaEnviar.senha; // Não enviar senha vazia
        }
        delete dadosParaEnviar.id; // Remover ID dos dados enviados

        funcionarioSalvo = await apiService.updateFuncionario(funcionarioParaEditar.id!, dadosParaEnviar);
      } else {
        // Criar novo funcionário
        funcionarioSalvo = await apiService.createFuncionario(formData);
      }

      setSuccess(funcionarioParaEditar ? 'Funcionário atualizado com sucesso!' : 'Funcionário cadastrado com sucesso!');

      setTimeout(() => {
        onFuncionarioCadastrado(funcionarioSalvo);
        onClose();
      }, 1500);

    } catch (error: any) {
      setError(error.message || 'Erro ao salvar funcionário');
    } finally {
      setLoading(false);
    }
  };

  const podeSalvar = () => {
    return formData.nome.trim() &&
      formData.email.trim() &&
      formData.cargo_id > 0 &&
      formData.empresa_id > 0 &&
      (!funcionarioParaEditar ? formData.senha : true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className="overflow-hidden shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto bg-white">
        {/* Header - CORREÇÃO: SEM rounded-t-lg */}
        <div className="bg-white flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {funcionarioParaEditar ? 'Editar Funcionário' : 'Cadastrar Novo Funcionário'}
            </h3>
            <p className="text-sm text-gray-500">
              {funcionarioParaEditar ? 'Atualize os dados do funcionário' : 'Preencha os dados do novo funcionário'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs - CORREÇÃO: COM bg-white */}
        <div className="bg-white border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('dados')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'dados'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <User className="w-4 h-4 inline mr-2" />
              Dados do Funcionário
            </button>
            <button
              onClick={() => setActiveTab('cargo')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'cargo'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <Building className="w-4 h-4 inline mr-2" />
              Cargo e Empresa
            </button>
          </nav>
        </div>

        {/* Content - CORREÇÃO: COM bg-white */}
        <div className="bg-white p-6">
          {loadingData ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Carregando dados...</span>
            </div>
          ) : (
            <>
              {/* Error/Success Messages */}
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex">
                    <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
                    <p className="text-red-700">{error}</p>
                  </div>
                </div>
              )}

              {success && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex">
                    <Check className="w-5 h-5 text-green-400 mr-2" />
                    <p className="text-green-700">{success}</p>
                  </div>
                </div>
              )}

              {/* Tab Content */}
              {activeTab === 'dados' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Nome */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nome Completo *
                      </label>
                      <input
                        type="text"
                        value={formData.nome}
                        onChange={(e) => handleInputChange('nome', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Digite o nome completo"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        E-mail *
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Digite o e-mail"
                      />
                    </div>

                    {/* Senha */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Senha {!funcionarioParaEditar && '*'}
                      </label>
                      <input
                        type="password"
                        value={formData.senha || ''}
                        onChange={(e) => handleInputChange('senha', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder={funcionarioParaEditar ? "Deixe em branco para manter a atual" : "Digite a senha"}
                      />
                      {funcionarioParaEditar && (
                        <p className="text-xs text-gray-500 mt-1">
                          Deixe em branco para manter a senha atual
                        </p>
                      )}
                    </div>

                    {/* Gerente */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tipo de Acesso
                      </label>
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            checked={!formData.gerente}
                            onChange={() => handleInputChange('gerente', false)}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700">Funcionário</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            checked={formData.gerente}
                            onChange={() => handleInputChange('gerente', true)}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700">Gerente</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'cargo' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Empresa */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Empresa *
                      </label>
                      <select
                        value={formData.empresa_id}
                        onChange={(e) => handleInputChange('empresa_id', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value={0}>Selecione uma empresa</option>
                        {empresas.map((empresa) => (
                          <option key={empresa.id} value={empresa.id}>
                            {empresa.nome} - {empresa.cnpj}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Cargo */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cargo *
                      </label>
                      <select
                        value={formData.cargo_id}
                        onChange={(e) => handleInputChange('cargo_id', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value={0}>Selecione um cargo</option>
                        {cargos
                          .filter(cargo => !formData.empresa_id || cargo.empresa_id === formData.empresa_id)
                          .map((cargo) => (
                            <option key={cargo.id} value={cargo.id}>
                              {cargo.nome} ({cargo.codigo})
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  {/* Informações do Cargo Selecionado */}
                  {formData.cargo_id > 0 && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Informações do Cargo</h4>
                      {(() => {
                        const cargoSelecionado = cargos.find(c => c.id === formData.cargo_id);
                        return cargoSelecionado ? (
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Código:</span>
                              <span className="ml-2 font-medium">{cargoSelecionado.codigo}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Nível:</span>
                              <span className="ml-2 font-medium">{cargoSelecionado.nivel || 'Não informado'}</span>
                            </div>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer - CORREÇÃO: COM bg-white */}
        <div className="bg-white flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={!podeSalvar() || loading}
            className="px-4 py-2 text-sm font-medium text-white bg-custom-blue rounded-lg hover:bg-custom-blue-light disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Salvando...
              </div>
            ) : (
              funcionarioParaEditar ? 'Atualizar' : 'Cadastrar'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
