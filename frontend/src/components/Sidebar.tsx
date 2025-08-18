import { NavLink } from 'react-router-dom';
import '../style/Sidebar.css'

const Sidebar = ()=>{
    return(
        <div className='collapsed'>
            <div className="brand">
                <div className="brand-logo">nome</div>
                <div className="brand-title">CRM</div>
            </div>
            <div className='menu'>
                <ul className="menu">
                    <li className="menu-item">
                        <NavLink 
                            to={'hhttps://chatgpt.com/c/689f1dbc-86a8-832b-9ddf-8a466bb72a5e'}
                            className={({ isActive }) =>`menu-link ${isActive ? 'active' : ''}`}
                        >
                            <span className='icon'></span>
                            <span className='label'> Home</span>
                        </NavLink>
                    </li>
                    <li className="menu-item">
                        <NavLink 
                            to={'hhttps://chatgpt.com/c/689f1dbc-86a8-832b-9ddf-8a466bb72a5e'}
                            className={({ isActive }) =>`menu-link ${isActive ? 'active' : ''}`}
                        >
                            <span className='icon'></span>
                            <span className='label'> Relatórios</span>
                        </NavLink>
                    </li>
                    <li className="menu-item">
                        <NavLink 
                            to={'hhttps://chatgpt.com/c/689f1dbc-86a8-832b-9ddf-8a466bb72a5e'}
                            className={({ isActive }) =>`menu-link ${isActive ? 'active' : ''}`}
                        >
                            <span className='icon'></span>
                            <span className='label'> Configurações</span>
                        </NavLink>
                    </li>
                </ul>
                <div className='section-title'>Outros</div>
            </div>
            <div className='sidebar-footer'>
                <div className='footer-row'>
                    <div className='small-icon'>🔔</div>
                    <div className="text">Notificações</div>
                </div>

                <div className="user">
                    <div className="profile">
                        <div className="avatar">👤</div>
                        <div className="name">Usuario</div>
                    </div>
                    <div className="chev">›</div>
                </div>
            </div>
        </div>
    )
}

export default Sidebar;