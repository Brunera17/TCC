import '../style/Sidebar.css'

const Sidebar = ()=>{
    return(
        <div className='container'>
            <h2 className='titulo'>Hello</h2>
            <div className='hub'>
                <h2 className='item'>
                    Home
                </h2>
                <h2 className='item'>
                    Relatórios
                </h2>
                <h2 className='item'>
                    Configurações
                </h2>
            </div>
            <div className='perfil'>
                <div className='perfil-img'>
                    <img src='../assets/react.svg' alt=''/>
                </div>
                <label className='usuario'>Nome do usuário</label>
                <div className='info'>
                    <label>Cargo:</label>
                    <label>Departamento</label>
                </div>
            </div>
        </div>
    )
}

export default Sidebar;