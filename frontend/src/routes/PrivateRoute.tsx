import { Navigate } from 'react-router-dom'

interface Props {
    children: JSX.Element
}

const PrivateRoute = ({ children }: Props) => {
    const autenticado = localStorage.getItem('autenticado') === 'true'

    return autenticado ? children : <Navigate to="/" />
}

export default PrivateRoute