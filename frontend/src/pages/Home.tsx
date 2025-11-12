import Sidebar from '../components/Sidebar'
import { Outlet } from 'react-router-dom'

const Home = () => {
    return(
        <div className="min-h-screen bg-gray-50 md:pl-64 flex flex-col">
            <Sidebar />
            <main className="min-h-screen p-4 md:p-6 w-full">
                <Outlet />
            </main>
        </div>
    )
}

export default Home;