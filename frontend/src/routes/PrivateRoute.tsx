import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LoadingSpinner } from '../components/common/LoadingSpinner'

interface Props {
    children: JSX.Element
}

const PrivateRoute = ({ children }: Props) => {
    const { isAuthenticated, loading } = useAuth()

    // Aguarda a validação inicial do token (AuthContext confere o token
    // junto ao backend em /usuarios/me) antes de decidir redirecionar,
    // para não expulsar o usuário durante um refresh de página.
    if (loading) {
        return <LoadingSpinner size="lg" className="min-h-screen" />
    }

    return isAuthenticated ? children : <Navigate to="/" />
}

export default PrivateRoute
