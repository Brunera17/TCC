import Sidebar from '../components/Sidebar'
import { Outlet } from 'react-router-dom'

const Home = () => {
    return(
        <div className="min-h-screen bg-gray-50 pl-64">
            <Sidebar />
            <main className="min-h-screen p-6">
                <Outlet />
            </main>
        </div>
    )
}

export default Home;