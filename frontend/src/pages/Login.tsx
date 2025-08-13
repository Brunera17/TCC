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

            navigate('/Home')
        }catch(err){
            setErro("Erro ao conectar com o banco: " + err.message);
        }
    }; 
    return(
        <div>
            <h2>Login</h2>
            <form onSubmit={handleLogin}>
                <div>
                    <label>Email:</label><br/>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label>Senha:</label><br/>
                    <input
                        type="password"
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                        required
                    />
                </div>
                
                {erro && <p style={{ color: 'red' }}>{erro}</p>}

                <button type="submit" style={{ marginTop: '1rem'}}>Entrar</button>
            </form>
        </div>
    )
}

export default Login