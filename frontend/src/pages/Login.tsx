import '../style/Login.css'
import { API_URL } from "../lib/api";
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const Login = () => {
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [senha, setSenha] = useState('')
    const [erro, setErro] = useState('')

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setErro('');

        try{
            const response = await fetch(`${API_URL}/autenticar`,{
                method: "POST",
                headers: { "Content-Type":"application/json"},
                body: JSON.stringify({
                    email: email,
                    senha: senha,
                }),
            });
            if(!response.ok){
                const data = await response.json(); 
                setErro(data.message || "Email ou senha inválidos");
                return;
            }
            const data = await response.json();
            localStorage.setItem('autenticado', 'true');
            navigate('/home')
        }catch(err){
            setErro("Erro ao conectar com o banco: " + err.message);
        }
    }; 
    return(
        <div className='secao-login'>   
            <form onSubmit={handleLogin}>
                <h2 className='title'>Login</h2>
                <div className='campos'>
                    <label>Email:</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div className='campos'>
                    <label>Senha:</label>
                    <input
                        type="password"
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                        required
                    />
                </div>
                
                {erro && <p className='erro'>{erro}</p>}

                <button type="submit">Entrar</button>
            </form>
        </div>
    )
}

export default Login
