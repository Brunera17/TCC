# ContGest — Sistema de Gestão para Escritórios de Contabilidade

> Trabalho de Conclusão de Curso (Tecnologia em Análise e Desenvolvimento de Sistemas, Uneduvale, 2025) que evoluiu para o ContGest, ERP hoje em produção atendendo 14 usuários reais.

## 📌 Sobre o projeto

Escritórios de contabilidade costumam gerenciar clientes, propostas comerciais e ordens de serviço de forma manual ou fragmentada em planilhas, o que gera retrabalho, falta de rastreabilidade e falhas de comunicação entre equipe e clientes. O ContGest centraliza esse fluxo em uma aplicação web única — do cadastro de clientes PF/PJ até a geração e acompanhamento de propostas comerciais em PDF — com controle de acesso, regras de negócio automatizadas e auditoria completa de operações.

## 🎯 O problema

Escritórios contábeis lidam com múltiplas entidades interdependentes (funcionários, clientes, serviços, propostas, ordens de serviço) que precisam de regras de negócio consistentes — por exemplo, limites de desconto, vínculos obrigatórios entre cliente e endereço, ou entre empresa e responsável legal. Sem um sistema estruturado, essas regras dependem de controle manual, o que aumenta o risco de erro humano e inconsistência de dados financeiros.

## 🛠️ Arquitetura e decisões técnicas

O sistema foi construído em **arquitetura de camadas**, com responsabilidades bem separadas:

```
Middleware → Controllers → Services → Repositories → Models
```

- **Middleware**: camada transversal que intercepta todas as requisições antes de chegarem ao resto do sistema. Responsável por autenticação (diferenciando gerentes de funcionários), validação de dados de entrada (CPF, CNPJ, limites de desconto), registro de logs de auditoria e controle de taxa de requisições.
- **Controllers**: expõem as rotas REST organizadas por módulo (funcionários/gerentes, clientes, serviços, solicitações, ordens de serviço, propostas comerciais) e só executam se o middleware autorizar.
- **Services**: concentram a lógica de negócio crítica — como o controle automático de desconto até 20% para funcionários, com fluxo de aprovação para valores acima disso, e o gerenciamento dos vínculos obrigatórios entre entidades.
- **Repositories**: encapsulam o acesso a dados, com consultas específicas para relatórios financeiros, controle de inadimplência e análise de receitas/despesas.
- **Models**: definem as entidades do domínio (usuário, cliente, empresa, endereço, serviço, solicitação, ordem de serviço, proposta) e garantem a integridade dos relacionamentos.

**Regras de negócio implementadas:**
- Soft delete em todas as exclusões (nada é removido de fato, garantindo rastreabilidade)
- Limite de desconto de 20% para funcionários, com aprovação obrigatória acima disso
- Vínculos obrigatórios entre entidades (funcionário-cargo-departamento, cliente-endereço, empresa-responsável legal)
- Geração de propostas comerciais via templates Jinja2 renderizados em PDF, com controle de versão por status (rascunho, enviado, aprovado)

## 📊 Resultados

- Evoluiu de protótipo acadêmico para sistema **em produção, atendendo 14 usuários reais**
- Arquitetura em camadas permitiu que a versão de produção migrasse de SQLite (usado no TCC, por limitação de concorrência) para **PostgreSQL + SQLAlchemy**, sem reescrever a lógica de negócio — prova de que a separação de responsabilidades funcionou na prática

## 🧩 Principais funcionalidades

- Gestão de funcionários e gerentes com controle de permissões
- Cadastro e gestão de clientes PF/PJ
- Catálogo de serviços e solicitações
- Emissão e acompanhamento de ordens de serviço
- Geração de propostas comerciais em PDF com controle de versão
- Relatórios financeiros (receitas, despesas, inadimplência)
- Auditoria completa via logs de middleware

## 💡 Desafios e aprendizados

O maior desafio de design foi decidir onde cada regra de negócio deveria viver. Regras simples de validação (formato de CPF/CNPJ) ficaram no Middleware, por serem transversais a todo o sistema. Já regras que dependem de contexto de negócio — como o limite de desconto e o fluxo de aprovação — foram isoladas na camada de Services, para não acoplar a lógica de negócio às rotas da API. Essa separação foi o que permitiu, mais tarde, trocar o banco de dados (SQLite → PostgreSQL) na evolução para produção sem precisar tocar nas regras de negócio.

Outro ponto foi modelar corretamente os vínculos obrigatórios entre entidades (ex: toda empresa precisa de um responsável legal, todo cliente precisa de um endereço) diretamente no nível de dados, evitando que registros inconsistentes chegassem a existir no banco.

## 🏗️ Estrutura do projeto

```
TCC/
├── backend/     # API REST em Flask — Middleware, Controllers, Services, Repositories, Models
└── frontend/    # Interface em React + TypeScript, estilizada com Tailwind CSS
```

## 🔧 Stack

**Backend:** `Python 3.12` `Flask` `SQLite` (protótipo) `PostgreSQL + SQLAlchemy` (produção)
**Frontend:** `React` `TypeScript` `Tailwind CSS`
**Design & Documentação:** `Figma` `Notion`

## 🚀 Como rodar localmente

```bash
# Backend
python -m venv venv
./venv/Scripts/activate  # (ou source venv/bin/activate no Linux/Mac)
pip install -r requirements.txt
python main.py

# Frontend
npm install
npm run dev
```

## 👤 Autor

**Bruno David Martins** — Desenvolvedor Full Stack
[GitHub](https://github.com/Brunera17) · [LinkedIn](https://www.linkedin.com/in/bruno-david-martins-906781222)
