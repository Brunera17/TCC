# 🌐 API Backend - Guia de Conexão e Rotas

## 🚀 Como Conectar ao Backend

### **1. Informações de Conexão**
- **URL Base**: `http://localhost:5000`
- **Protocolo**: HTTP/HTTPS
- **CORS**: Configurado para `http://localhost:5173` (React)
- **Autenticação**: JWT Bearer Token

### **2. Iniciar o Servidor**
```bash
cd "C:\Users\dbrun\OneDrive\Desktop\TCC real oficial\backend"
python main.py
```

### **3. Verificar se API está funcionando**
```bash
GET http://localhost:5000/
```
**Resposta esperada:**
```json
{
  "message": "API está funcionando"
}
```

---

## 🔐 Autenticação

### **Login**
```
POST /api/usuarios/login
Content-Type: application/json

{
  "identificador": "admin",
  "senha": "admin123"
}
```

**Resposta de sucesso:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "Bearer",
  "expires_in": 900,
  "user": {
    "id": 1,
    "nome": "Administrador",
    "email": "admin@admin.com",
    "tipo_usuario": "admin"
  }
}
```

### **Como usar o Token**
Incluir em todas as requisições protegidas:
```
Authorization: Bearer SEU_TOKEN_AQUI
```

### **Credenciais Padrão**
- **Username**: `admin`
- **Email**: `admin@admin.com`
- **Senha**: `admin123`
- **CPF**: `11111111111`

---

## 📋 Rotas da API

### 🔵 **1. USUÁRIOS** (`/api/usuarios`)

#### **Rotas Públicas**
```bash
POST /api/usuarios/login                    # Login de usuário
POST /api/usuarios/registro                 # Registro de novo usuário
```

#### **Rotas Protegidas** (Requer Token)
```bash
GET    /api/usuarios                        # Listar todos os usuários
GET    /api/usuarios/{id}                   # Buscar usuário específico  
PUT    /api/usuarios/{id}                   # Atualizar usuário
DELETE /api/usuarios/{id}                   # Deletar usuário (só admin)
GET    /api/usuarios/me                     # Ver próprio perfil
GET    /api/usuarios/username/{username}    # Buscar por username
GET    /api/usuarios/ultimo_login/{dias}    # Usuários por último login (admin)
```

**Exemplo de criação de usuário:**
```json
POST /api/usuarios/registro
{
  "nome": "João Silva",
  "email": "joao@email.com",
  "username": "joao123",
  "senha": "senha123",
  "tipo_usuario": "funcionario",
  "cpf": "12345678901"
}
```

> **Observação:** ao tentar criar um usuário com `username`, `email` ou `cpf` já associados a um registro inativo, a API reativa o cadastro existente e substitui os dados pelos enviados (respeitando as regras de unicidade). Para registros ativos, a API retorna erro `400`.

---

### 👥 **1.1 FUNCIONÁRIOS** (`/api/funcionarios`)

Alias direto dos usuários para uso no módulo de funcionários. As respostas usam o mesmo modelo de dados (`Usuario.to_json()`) e exigem autenticação com token Bearer.

```bash
GET    /api/funcionarios                     # Listar funcionários ativos
POST   /api/funcionarios                     # Criar ou reativar funcionário
GET    /api/funcionarios/{id}                # Buscar funcionário por ID
PUT    /api/funcionarios/{id}                # Atualizar funcionário existente
DELETE /api/funcionarios/{id}                # Desativar funcionário (soft delete)
GET    /api/funcionarios/buscar?termo={q}    # Buscar por nome, e-mail ou username
```

**Payload mínimo para criação/reativação:**

```json
POST /api/funcionarios
{
  "nome": "Ana Paula",
  "email": "ana.paula@empresa.com",
  "username": "apaula",
  "senha": "Senha@2025",
  "tipo_usuario": "funcionario",
  "cpf": "98765432100",          // opcional
  "eh_gerente": false,            // aceita boolean, "true", "1", "sim"
  "cargo_id": 3                   // opcional
}
```

#### Comportamentos importantes

- Se existir funcionário inativo com o mesmo `username`, `email` ou `cpf`, ele é reativado automaticamente com os dados novos (senha redefinida).
- Soft delete (`DELETE`) apenas marca `ativo=false` mantendo histórico.
- Busca (`/buscar`) exige `termo` com pelo menos 2 caracteres e filtra por nome/e-mail/username.

---

### 👥 **2. CLIENTES** (`/api/clientes`)

```bash
GET    /api/clientes                        # Listar todos os clientes
GET    /api/clientes/{id}                   # Buscar cliente específico
POST   /api/clientes                       # Criar novo cliente
PUT    /api/clientes/{id}                  # Atualizar cliente
DELETE /api/clientes/{id}                  # Deletar cliente
```

**Exemplo de criação de cliente:**
```json
POST /api/clientes
{
  "nome": "Maria Santos",
  "cpf": "12345678901",
  "email": "maria@email.com",
  "telefone": "11999999999",
  "endereco": "Rua das Flores, 123",
  "observacoes": "Cliente VIP"
}
```

---

### 🏢 **3. EMPRESAS** (`/api/empresas`)

```bash
GET    /api/empresas                        # Listar todas as empresas
GET    /api/empresas/{id}                   # Buscar empresa específica
POST   /api/empresas                       # Criar nova empresa
PUT    /api/empresas/{id}                  # Atualizar empresa
DELETE /api/empresas/{id}                  # Deletar empresa
```

**Exemplo de criação de empresa:**
```json
POST /api/empresas
{
  "nome": "Tech Solutions LTDA",
  "cnpj": "12345678000199",
  "endereco": "Av. Paulista, 1000",
  "telefone": "1133334444",
  "email": "contato@techsolutions.com"
}
```

---

### 🏛️ **4. DEPARTAMENTOS** (`/api/departamentos`)

```bash
GET    /api/departamentos                   # Listar todos os departamentos
GET    /api/departamentos/{id}              # Buscar departamento específico
GET    /api/departamentos/empresa/{id}      # Departamentos por empresa
GET    /api/departamentos/search?q={termo}  # Buscar por nome
POST   /api/departamentos                  # Criar novo departamento
PUT    /api/departamentos/{id}             # Atualizar departamento
DELETE /api/departamentos/{id}             # Deletar departamento
GET    /api/departamentos/empresa/{id}/estatisticas  # Estatísticas por empresa
GET    /api/departamentos/relatorio/geral  # Relatório geral
```

**Exemplo de criação de departamento:**
```json
POST /api/departamentos
{
  "nome": "Desenvolvimento",
  "descricao": "Departamento de desenvolvimento de software",
  "status": "ativo",
  "empresa_id": 1
}
```

**Parâmetros de consulta disponíveis:**
- `?empresa_id=1` - Filtrar por empresa
- `?status=ativo` - Filtrar por status (ativo/inativo/suspenso)
- `?search=desenvolvimento` - Buscar por termo no nome

---

### �️ **5. SERVIÇOS** (`/api/servicos`)

```bash
GET    /api/servicos                        # Listar todos os serviços
GET    /api/servicos/{id}                   # Buscar serviço específico
GET    /api/servicos/categoria/{id}         # Serviços por categoria
GET    /api/servicos/codigo/{codigo}        # Buscar por código
GET    /api/servicos/nome/{nome}            # Buscar por nome
POST   /api/servicos                       # Criar novo serviço
PUT    /api/servicos/{id}                  # Atualizar serviço
DELETE /api/servicos/{id}                  # Deletar serviço
```

**Exemplo de criação de serviço:**
```json
POST /api/servicos
{
  "codigo": "CONS001",
  "nome": "Consultoria Empresarial",
  "descricao": "Consultoria para melhoria de processos",
  "valor_unitario": 150.00,
  "categoria_id": 1,
  "regras_cobranca": "Por hora"
}
```

---

### 📂 **6. CATEGORIAS DE SERVIÇOS** (`/api/categorias-servicos`)

```bash
GET    /api/categorias-servicos             # Listar todas as categorias
GET    /api/categorias-servicos/{id}        # Buscar categoria específica
GET    /api/categorias-servicos/{id}/servicos # Listar serviços da categoria
POST   /api/categorias-servicos            # Criar nova categoria
PUT    /api/categorias-servicos/{id}       # Atualizar categoria
DELETE /api/categorias-servicos/{id}       # Deletar categoria
```

**Exemplo de criação de categoria:**
```json
POST /api/categorias-servicos
{
  "nome": "Consultoria",
  "descricao": "Serviços de consultoria empresarial"
}
```

**Exemplo de resposta - Serviços de uma categoria:**
```json
GET /api/categorias-servicos/1/servicos
{
  "categoria": {
    "id": 1,
    "nome": "Consultoria",
    "descricao": "Serviços de consultoria empresarial",
    "ativo": true,
    "created_at": "2025-10-20T17:32:42.055777",
    "updated_at": "2025-10-20T17:32:42.055777"
  },
  "servicos": [
    {
      "id": 1,
      "codigo": "CONS001",
      "nome": "Consultoria Empresarial",
      "descricao": "Consultoria para melhoria de processos",
      "valor_unitario": 200.0,
      "regras_cobranca": "Por hora - mínimo 2 horas",
      "categoria_id": 1,
      "ativo": true,
      "created_at": "2025-10-20T17:33:07.180775",
      "updated_at": "2025-10-20T17:34:55.092961"
    }
  ]
}
```

---

### �📍 **7. ENDEREÇOS** (`/api/enderecos`)

```bash
GET    /api/enderecos                       # Listar todos os endereços
GET    /api/enderecos/{id}                  # Buscar endereço específico
POST   /api/enderecos                      # Criar novo endereço
PUT    /api/enderecos/{id}                 # Atualizar endereço
DELETE /api/enderecos/{id}                 # Deletar endereço
```

**Exemplo de criação de endereço:**
```json
POST /api/enderecos
{
  "logradouro": "Rua das Palmeiras",
  "numero": "456",
  "complemento": "Apto 101",
  "bairro": "Centro",
  "cidade": "São Paulo",
  "estado": "SP",
  "cep": "01234567",
  "cliente_id": 1
}
```

---

### 🏛️ **8. ENTIDADES JURÍDICAS** (`/api/entidades-juridicas`)

```bash
GET    /api/entidades-juridicas             # Listar todas as entidades
GET    /api/entidades-juridicas/{id}        # Buscar entidade específica
POST   /api/entidades-juridicas            # Criar nova entidade
PUT    /api/entidades-juridicas/{id}       # Atualizar entidade
DELETE /api/entidades-juridicas/{id}       # Deletar entidade
```

**Exemplo de criação de entidade jurídica:**
```json
POST /api/entidades-juridicas
{
  "razao_social": "Empresa ABC LTDA",
  "nome_fantasia": "ABC Tecnologia",
  "cnpj": "98765432000111",
  "contato": "João Diretor",
  "inscricao_estadual": "123456789",
  "cliente_id": 1,
  "status": "ativa"
}
```

---

### 📅 **9. AGENDAMENTOS** (`/api/agendamentos`)

```bash
GET    /api/agendamentos                    # Listar todos os agendamentos
GET    /api/agendamentos/{id}               # Buscar agendamento específico
GET    /api/agendamentos/funcionario/{id}   # Agendamentos por funcionário
POST   /api/agendamentos                   # Criar novo agendamento
PUT    /api/agendamentos/{id}              # Atualizar agendamento
DELETE /api/agendamentos/{id}              # Deletar agendamento
```

**Exemplo de criação de agendamento:**
```json
POST /api/agendamentos
{
  "titulo": "Reunião com Cliente",
  "data_inicio": "2025-10-20T09:00:00",
  "data_fim": "2025-10-20T10:00:00",
  "descricao": "Discussão sobre projeto",
  "tipo": "reuniao",
  "status": "pendente",
  "funcionario_id": 1,
  "local": "Sala de Reuniões 1"
}
```

---

### 💼 **10. PROPOSTAS** (`/api/propostas`)

```bash
GET    /api/propostas                       # Listar todas as propostas
GET    /api/propostas/{id}                  # Buscar proposta específica
GET    /api/propostas/cliente/{id}          # Propostas por cliente
POST   /api/propostas                      # Criar nova proposta
PUT    /api/propostas/{id}                 # Atualizar proposta
DELETE /api/propostas/{id}                 # Deletar proposta
```

**Exemplo de criação de proposta:**
```json
POST /api/propostas
{
  "numero_proposta": "PROP-2025-001",
  "cliente_id": 1,
  "usuario_id": 1,
  "validade": "2025-11-20T23:59:59",
  "observacao": "Proposta para desenvolvimento de sistema",
  "status": "rascunho",
  "valor_total": 15000.00
}
```

---

### 🛠️ **11. ORDENS DE SERVIÇO** (`/api/ordens-servico`)

```bash
GET    /api/ordens-servico                  # Listar todas as ordens
GET    /api/ordens-servico/{id}             # Buscar ordem específica
GET    /api/ordens-servico/cliente/{id}     # Ordens por cliente
POST   /api/ordens-servico                 # Criar nova ordem
PUT    /api/ordens-servico/{id}            # Atualizar ordem
DELETE /api/ordens-servico/{id}            # Deletar ordem
```

**Exemplo de criação de ordem de serviço:**
```json
POST /api/ordens-servico
{
  "protocolo": "OS-2025-001",
  "cliente_id": 1,
  "usuario_id": 1,
  "departamento_id": 1,
  "vencimento": "2025-11-01T23:59:59",
  "observacao": "Desenvolvimento de módulo CRM",
  "status": "aberta"
}
```

---

### 📊 **12. RELATÓRIOS** (`/api/relatorios`)

#### **Relatórios Predefinidos**
```bash
GET    /api/relatorios/clientes             # Relatório de clientes
GET    /api/relatorios/propostas            # Relatório de propostas
GET    /api/relatorios/agendamentos         # Relatório de agendamentos
GET    /api/relatorios/servicos             # Relatório de serviços
GET    /api/relatorios/financeiro           # Relatório financeiro
```

#### **Relatórios Personalizados**
```bash
GET    /api/relatorios                      # Listar relatórios salvos
POST   /api/relatorios                     # Criar relatório
POST   /api/relatorios/custom              # Relatório customizado
GET    /api/relatorios/{id}                # Buscar relatório específico
PUT    /api/relatorios/{id}                # Atualizar relatório
DELETE /api/relatorios/{id}                # Deletar relatório
POST   /api/relatorios/export              # Exportar relatório
```

**Exemplo de relatório customizado:**
```json
POST /api/relatorios/custom
{
  "titulo": "Vendas Q4 2025",
  "tipo": "vendas",
  "filtros": {
    "data_inicio": "2025-10-01",
    "data_fim": "2025-12-31",
    "status": "aprovada"
  },
  "campos": ["cliente", "valor", "data_criacao"]
}
```

---

## 🔄 Exemplos de Uso com JavaScript/Fetch

### **Login e Armazenar Token**
```javascript
// Login
async function login() {
  const response = await fetch('http://localhost:5000/api/usuarios/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      identificador: 'admin',
      senha: 'admin123'
    })
  });
  
  const data = await response.json();
  
  if (response.ok) {
    // Armazenar token
    localStorage.setItem('token', data.access_token);
    console.log('Login realizado com sucesso!');
  } else {
    console.error('Erro no login:', data.error);
  }
}
```

### **Fazer Requisição Autenticada**
```javascript
// Buscar usuários (rota protegida)
async function buscarUsuarios() {
  const token = localStorage.getItem('token');
  
  const response = await fetch('http://localhost:5000/api/usuarios', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  
  const usuarios = await response.json();
  console.log('Usuários:', usuarios);
}
```

### **Criar Cliente**
```javascript
async function criarCliente() {
  const token = localStorage.getItem('token');
  
  const response = await fetch('http://localhost:5000/api/clientes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      nome: 'Novo Cliente',
      cpf: '12345678901',
      email: 'cliente@email.com',
      telefone: '11999999999'
    })
  });
  
  const cliente = await response.json();
  console.log('Cliente criado:', cliente);
}
```

---

## 🔧 Configuração CORS

O backend está configurado para aceitar requisições de:
- `http://localhost:5173` (React dev server)
- `http://127.0.0.1:5173`

**Métodos permitidos:** GET, POST, PUT, DELETE, OPTIONS
**Headers permitidos:** Content-Type, Authorization

---

## ⚠️ Códigos de Status HTTP

| Código | Significado |
|--------|-------------|
| `200` | Sucesso |
| `201` | Criado com sucesso |
| `400` | Dados inválidos |
| `401` | Não autorizado (token inválido) |
| `403` | Acesso negado (sem permissão) |
| `404` | Recurso não encontrado |
| `500` | Erro interno do servidor |

---

## 🐛 Debugging e Logs

### **Verificar Logs do Servidor**
O servidor Flask mostra logs no console, incluindo:
- Requisições HTTP
- Erros de validação
- Debug de autenticação

### **Testar Endpoints com curl (PowerShell)**
```powershell
# Login
$body = '{"identificador": "admin", "senha": "admin123"}'
$headers = @{ "Content-Type" = "application/json" }
Invoke-WebRequest -Uri "http://localhost:5000/api/usuarios/login" -Method POST -Body $body -Headers $headers

# Buscar usuários (com token)
$token = "SEU_TOKEN_AQUI"
$headers = @{ 
  "Content-Type" = "application/json"
  "Authorization" = "Bearer $token"
}
Invoke-WebRequest -Uri "http://localhost:5000/api/usuarios" -Method GET -Headers $headers
```

---

## 🚀 Próximos Passos

1. **Integrar com React**: Use as rotas documentadas para conectar seu frontend
2. **Implementar refresh token**: Para renovar tokens expirados
3. **Adicionar validação avançada**: Implementar mais regras de negócio
4. **Implementar paginação**: Para listas grandes de dados
5. **Adicionar filtros**: Query parameters para busca avançada

---

**🎯 Seu backend está pronto para uso! Todas as rotas estão funcionais e documentadas.**