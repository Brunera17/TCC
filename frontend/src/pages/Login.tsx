import { API_URL } from "../lib/api";
import { useState } from 'react'
import { Eye, EyeOff, Lock, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom'

const Login = () => {
    const navigate = useNavigate()
    const [identificador, setIdentificador] = useState('')
    const [senha, setSenha] = useState('')
    const [erro, setErro] = useState('')
    const [carregando, setCarregando] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setErro('')
        setCarregando(true)

        try {
            const response = await fetch(`${API_URL}/usuarios/login`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({
                    identificador: identificador,
                    senha: senha
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setErro(data.error || "Credenciais inválidas");
                return;
            }
            
            // Salvar tokens e dados do usuário no localStorage
            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('refresh_token', data.refresh_token);
            localStorage.setItem('token', data.access_token); // Para compatibilidade com sua lib/api
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('autenticado', 'true');
            
            navigate('/home')
        } catch (err: any) {
            console.error('Erro de login:', err);
            setErro("Erro ao conectar com o servidor. Verifique se o backend está rodando.");
        } finally {
            setCarregando(false)
        }
    };

    return(
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-lg shadow-xl p-8">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-gray-900">Sistema</h1>
                        <p className="text-gray-600 mt-2">Faça login para continuar</p>
                    </div>
                    
                    {erro && (
                        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
                            {erro}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Usuário
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    type="text"
                                    value={identificador}
                                    onChange={(e) => setIdentificador(e.target.value)}
                                    required
                                    disabled={carregando}
                                    placeholder="Digite seu nome de usuário"
                                />
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Senha
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    type={showPassword ? "text" : "password"}
                                    value={senha}
                                    onChange={(e) => setSenha(e.target.value)}
                                    required
                                    disabled={carregando}
                                    placeholder="Digite sua senha"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={carregando}
                            className="w-full bg-gradient-to-br from-blue-500 to-blue-900 text-white py-3 px-4 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                        >
                            {carregando ? 'Entrando...' : 'Entrar'}
                        </button>
                    </form>                    
                </div>
            </div>
        </div>
    )
}

export default Login
