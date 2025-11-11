import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Building2, Mail, RefreshCcw, Save, Shield, User as UserIcon,
    UploadCloud, X
} from 'lucide-react';

import { apiService, ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Card, PageHeader, ErrorMessage } from '../components/ui'; // ErrorMessage importado
import { FormField } from '../components/forms/FormField';
import { Input } from '../components/forms/Input';
import { Button } from '../components/forms/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

// Interface do usuário (mantida)
interface UsuarioDetalhado {
    id: number;
    nome?: string;
    email?: string;
    username?: string;
    tipo_usuario?: string;
    foto?: string | null;
    eh_gerente?: boolean;
    status?: string;
    cargo?: { id: number; nome?: string } | null;
    departamento?: { id: number; nome?: string; descricao?: string; empresa?: { id: number; nome?: string } | null } | null;
    empresa?: { id: number; nome?: string } | null;
    ultimo_login?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
}

// Interface do formulário (simplificada, 'foto' removida)
interface PerfilFormValues {
    nome: string;
    email: string;
    username: string;
}

// Erros (simplificado, 'foto' agora é tratado separadamente)
type FormErrors = Partial<Record<keyof PerfilFormValues, string>> & { foto?: string };

const MAX_FOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

// --- Helpers (movidos para o topo para melhor legibilidade) ---

const formatDateTime = (value?: string | null): string => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short'
    }).format(date);
};

const normalizeStatus = (status?: string): string => {
    if (!status) return '—';
    const mapa: Record<string, string> = {
        ativo: 'Ativo',
        inativo: 'Inativo',
        suspenso: 'Suspenso'
    };
    const chave = status.toLowerCase();
    return mapa[chave] ?? status;
};

/**
 * Subcomponente para exibir linhas de informação padronizadas
 */
const InfoItem: React.FC<{ label: string; value: React.ReactNode; icon?: React.ElementType; className?: string }> = ({
    label,
    value,
    icon: Icon,
    className
}) => (
    <div className={`flex items-start justify-between py-2 ${className}`}>
        <span className="flex items-center text-sm font-medium text-gray-600">
            {Icon && <Icon className="h-4 w-4 mr-2" />}
            {label}
        </span>
        <span className="text-sm text-right text-gray-900 break-words max-w-[60%]">
            {value ?? '—'}
        </span>
    </div>
);


// --- Componente Principal ---

const Configuracoes: React.FC = () => {
    const { user, syncUser } = useAuth();
    const { showError, showSuccess } = useToast();

    const [perfil, setPerfil] = useState<UsuarioDetalhado | null>(null);
    const [formValues, setFormValues] = useState<PerfilFormValues>({
        nome: '',
        email: '',
        username: '',
    });
    const [errors, setErrors] = useState<FormErrors>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [loadError, setLoadError] = useState('');

    // --- Lógica da Foto ---
    const [fotoPreview, setFotoPreview] = useState<string>('');
    const [fotoData, setFotoData] = useState<string | null | undefined>(undefined);
    const [fotoNome, setFotoNome] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    // ---------------------

    const clearFotoError = useCallback(() => {
        setErrors(prev => {
            if (!prev.foto) return prev;
            const next: FormErrors = { ...prev };
            delete next.foto;
            return next;
        });
    }, []);

    // Sincroniza o localStorage se o usuário for atualizado
    // Popula o formulário e o preview da foto
    const populateForm = useCallback((dados: UsuarioDetalhado | null) => {
        clearFotoError();
        setFotoNome('');
        setFotoData(undefined);

        if (!dados) {
            setFotoPreview('');
            setFormValues({ nome: '', email: '', username: '' });
            return;
        }

        setFotoPreview(dados.foto ?? '');
        setFormValues({
            nome: dados.nome ?? '',
            email: dados.email ?? '',
            username: dados.username ?? '',
        });
    }, [clearFotoError]);

    // Carrega o perfil do usuário
    const carregarPerfil = useCallback(async () => {
        setLoading(true);
        setLoadError('');
        try {
            const dados = await apiService.getPerfil();
            const coerced = dados as UsuarioDetalhado;
            setPerfil(coerced);
            populateForm(coerced);
        } catch (err) {
            const mensagem = err instanceof ApiError
                ? (typeof err.details === 'string' ? err.details : err.details?.message || err.message)
                : err instanceof Error
                    ? err.message
                    : 'Não foi possível carregar os dados do perfil.';
            setLoadError(mensagem);
            showError('Erro ao carregar perfil', mensagem);
        } finally {
            setLoading(false);
        }
    }, [populateForm, showError]);

    useEffect(() => {
        carregarPerfil();
    }, [carregarPerfil]);

    const handleChange = <Key extends keyof PerfilFormValues>(campo: Key, valor: PerfilFormValues[Key]) => {
        setFormValues(prev => ({
            ...prev,
            [campo]: valor
        }));
        // Limpa o erro do campo ao digitar
        if (errors[campo]) {
            setErrors(prev => {
                const next: FormErrors = { ...prev };
                delete next[campo];
                return next;
            });
        }
    };

    // Handler para mudança de foto
    const handleFotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        clearFotoError();

        const file = event.target.files?.[0];
        if (!file) {
            setFotoData(undefined);
            setFotoNome('');
            return;
        }

        // Validação de arquivo
        if (!file.type.startsWith('image/')) {
            setErrors(prev => ({ ...prev, foto: 'Envie um arquivo de imagem válido.' }));
            event.target.value = '';
            return;
        }

        if (file.size > MAX_FOTO_SIZE_BYTES) {
            setErrors(prev => ({ ...prev, foto: 'A imagem deve ter no máximo 5 MB.' }));
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result;
            if (typeof result === 'string') {
                setFotoPreview(result);
                setFotoData(result);
                setFotoNome(file.name);
            } else {
                setErrors(prev => ({ ...prev, foto: 'Não foi possível processar o arquivo selecionado.' }));
                setFotoPreview('');
                setFotoData(undefined);
                setFotoNome('');
            }
        };

        reader.onerror = () => {
            setErrors(prev => ({ ...prev, foto: 'Não foi possível ler o arquivo selecionado.' }));
            setFotoPreview('');
            setFotoData(undefined);
            setFotoNome('');
        };

        reader.readAsDataURL(file);
    };

    // Handler para remover foto
    const handleRemoverFoto = () => {
        clearFotoError();
        setFotoPreview('');
        setFotoData(null);
        setFotoNome('');
        if (fileInputRef.current) {
            fileInputRef.current.value = ''; // Limpa o input de arquivo
        }
    };

    // Validação do formulário
    const validate = (): boolean => {
        const validationErrors: FormErrors = {};

        if (!formValues.nome.trim()) {
            validationErrors.nome = 'Informe seu nome completo.';
        }
        if (!formValues.email.trim()) {
            validationErrors.email = 'Informe um e-mail válido.';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formValues.email.trim())) {
            validationErrors.email = 'E-mail inválido.';
        }
        if (!formValues.username.trim()) {
            validationErrors.username = 'Informe um nome de usuário.';
        }

        // A validação da foto já foi feita no `handleFotoChange`
        // Apenas copiamos o erro se ele existir
        if (errors.foto) {
            validationErrors.foto = errors.foto;
        }

        setErrors(validationErrors);
        return Object.keys(validationErrors).length === 0;
    };

    // Submissão do formulário
    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        
        if (!validate()) {
            return;
        }

        const basePayload = {
            nome: formValues.nome.trim(),
            email: formValues.email.trim(),
            username: formValues.username.trim()
        };

        const fotoPayload = fotoData !== undefined ? fotoData : (fotoPreview || null);

        const payload: Record<string, unknown> = {
            ...basePayload,
            foto: fotoPayload
        };

        setSaving(true);
        try {
            const atualizado = await apiService.updatePerfil(payload);
            const coerced = atualizado as UsuarioDetalhado;
            setPerfil(coerced);
            populateForm(coerced); // Repopula o form com os dados salvos (ex: nova URL de foto)
            syncUser(coerced);
            showSuccess('Perfil atualizado', 'As informações foram salvas com sucesso.');
        } catch (err) {
            const mensagem = err instanceof ApiError
                ? (typeof err.details === 'string' ? err.details : err.details?.message || err.message)
                : err instanceof Error
                    ? err.message
                    : 'Não foi possível salvar as alterações.';
            showError('Falha ao salvar perfil', mensagem);
        } finally {
            setSaving(false);
        }
    };

    const handleRefresh = () => {
        carregarPerfil();
    };

    const departamentoNome = perfil?.departamento?.nome ?? perfil?.cargo?.nome ?? '—';
    const empresaNome = perfil?.empresa?.nome
        ?? perfil?.departamento?.empresa?.nome
        ?? user?.empresa?.nome
        ?? '—';

    return (
        <div className="space-y-6">
            <PageHeader
                title="Configurações"
                subtitle="Gerencie os dados da sua conta e consulte detalhes do ambiente."
            >
                <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<RefreshCcw className="h-4 w-4" />}
                    onClick={handleRefresh}
                    disabled={loading || saving}
                >
                    {loading ? 'Carregando...' : 'Atualizar'}
                </Button>
            </PageHeader>

            {loadError && (
                <ErrorMessage message={loadError} onDismiss={() => setLoadError('')} />
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                
                {/* Coluna da Esquerda (Informações) */}
                <div className="lg:col-span-1 space-y-6">
                    
                    {/* Card de Foto */}
                    <Card title="Foto de Perfil" icon={UserIcon}>
                        <div className="flex flex-col items-center space-y-4">
                            <div className="relative">
                                {fotoPreview ? (
                                    <img
                                        src={fotoPreview}
                                        alt="Preview do Perfil"
                                        className="h-32 w-32 rounded-full object-cover border-4 border-gray-100 shadow-sm"
                                    />
                                ) : (
                                    <div className="h-32 w-32 rounded-full bg-gray-100 flex items-center justify-center border-4 border-gray-100 shadow-sm">
                                        <UserIcon className="h-16 w-16 text-gray-400" />
                                    </div>
                                )}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFotoChange}
                                    accept="image/png, image/jpeg, image/webp"
                                    className="sr-only"
                                    aria-label="Selecionar nova foto de perfil"
                                />
                            </div>

                            {errors.foto && (
                                <p className="text-sm text-red-600 text-center">{errors.foto}</p>
                            )}

                            <div className="flex space-x-2">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    leftIcon={<UploadCloud className="h-4 w-4" />}
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={saving}
                                >
                                    Alterar Foto
                                </Button>
                                {fotoPreview && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        leftIcon={<X className="h-4 w-4" />}
                                        onClick={handleRemoverFoto}
                                        disabled={saving}
                                    >
                                        Remover
                                    </Button>
                                )}
                            </div>
                            {fotoNome && (
                                <p className="text-xs text-gray-500 text-center">Arquivo selecionado: {fotoNome}</p>
                            )}
                        </div>
                    </Card>

                    {/* Card de Resumo */}
                    <Card title="Resumo do usuário" icon={UserIcon}>
                        {loading ? (
                            <LoadingSpinner size="sm" className="py-6" />
                        ) : (
                            <div className="space-y-1">
                                <InfoItem label="Nome completo" value={perfil?.nome} />
                                <InfoItem label="E-mail" value={perfil?.email} />
                                <InfoItem label="Username" value={<span className="font-mono">{perfil?.username}</span>} />
                                <InfoItem label="Tipo de usuário" value={<span className="capitalize">{perfil?.tipo_usuario}</span>} />
                                <InfoItem label="Gerente" value={perfil?.eh_gerente ? 'Sim' : 'Não'} />
                                <InfoItem label="Status" value={normalizeStatus(perfil?.status)} />
                                <InfoItem label="Último login" value={formatDateTime(perfil?.ultimo_login)} />
                            </div>
                        )}
                    </Card>

                    {/* Card de Vínculos */}
                    <Card title="Vínculos" icon={Building2}>
                        {loading ? (
                            <LoadingSpinner size="sm" className="py-6" />
                        ) : (
                            <div className="space-y-1">
                                <InfoItem label="Empresa" value={empresaNome} />
                                <InfoItem label="Departamento/Cargo" value={departamentoNome} />
                                <InfoItem label="Criado em" value={formatDateTime(perfil?.created_at)} />
                                <InfoItem label="Atualizado em" value={formatDateTime(perfil?.updated_at)} />
                            </div>
                        )}
                    </Card>

                    
                </div>

                {/* Coluna da Direita (Ações) */}
                <div className="lg:col-span-1 space-y-6">
                    
                    {/* Card de Edição */}
                    <Card title="Editar perfil" icon={Mail}>
                        <form className="space-y-6" onSubmit={handleSubmit}>
                            <FormField label="Nome" required error={errors.nome}>
                                <Input
                                    value={formValues.nome}
                                    onChange={(event) => handleChange('nome', event.target.value)}
                                    placeholder="Seu nome completo"
                                    disabled={saving || loading}
                                />
                            </FormField>

                            <FormField label="E-mail" required error={errors.email}>
                                <Input
                                    type="email"
                                    value={formValues.email}
                                    onChange={(event) => handleChange('email', event.target.value)}
                                    placeholder="nome@empresa.com"
                                    disabled={saving || loading}
                                />
                            </FormField>

                            <FormField label="Nome de usuário" required error={errors.username}>
                                <Input
                                    value={formValues.username}
                                    onChange={(event) => handleChange('username', event.target.value)}
                                    placeholder="usuario"
                                    disabled={saving || loading}
                                />
                            </FormField>

                            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => populateForm(perfil)}
                                    disabled={saving || loading}
                                >
                                    Desfazer alterações
                                </Button>
                                <Button
                                    type="submit"
                                    variant="secondary"
                                    leftIcon={<Save className="h-4 w-4" />}
                                    loading={saving}
                                >
                                    Salvar alterações
                                </Button>
                            </div>
                        </form>
                    </Card>
                    <Card title="Segurança" icon={Shield}>
                        <div className="space-y-1">
                            <InfoItem label="Autenticação ativa" value={user ? 'Sim' : 'Não'} />
                            <InfoItem label="Token no navegador" value={localStorage.getItem('access_token') ? 'Presente' : 'Ausente'} />
                            <InfoItem label="Refresh token" value={localStorage.getItem('refresh_token') ? 'Presente' : 'Ausente'} />
                            <InfoItem label="Último login" value={formatDateTime(perfil?.ultimo_login)} />
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default Configuracoes;