import Sidebar from '../components/Sidebar'
import { Outlet } from 'react-router-dom'

const Home = () => {
    return(
        <div className="flex h-screen bg-gray-50">
            <Sidebar />
            <div className="flex-1 p-6">
                <Outlet />
            </div>
        </div>
    )
}

export default Home;