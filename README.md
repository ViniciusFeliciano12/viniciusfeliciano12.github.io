<div align="center">

<br/>

<img src="https://img.shields.io/badge/⚡_RPG-AURORES-C89B32?style=for-the-badge&labelColor=0E0B07&color=C89B32" height="36" alt="RPG Aurores"/>

### Sistema de Fichas e Campanhas para o RPG Aurores
*Sistema d100 ambientado no universo de Harry Potter*

<br/>

![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla%20ES6+-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![Firebase](https://img.shields.io/badge/Firebase-10.12-DD2C00?style=flat-square&logo=firebase&logoColor=white)
![Firestore](https://img.shields.io/badge/Firestore-NoSQL-FFA000?style=flat-square&logo=firebase&logoColor=white)
![GitHub Pages](https://img.shields.io/badge/Deploy-GitHub%20Pages-181717?style=flat-square&logo=github)
![Status](https://img.shields.io/badge/Status-Em%20Desenvolvimento-4CAF50?style=flat-square)

<br/>

</div>

---

## Sobre

**RPG Aurores** é uma plataforma web completa para gerenciar partidas do sistema d100 de mesmo nome, com fichas de personagem em tempo real, sistema de combate, gerenciamento de campanhas e painel exclusivo para Mestres.

Roda inteiramente no navegador — sem frameworks, sem build step — usando Firebase para autenticação e banco de dados em nuvem com sincronização entre dispositivos.

---

## Funcionalidades

| Área | Recursos |
|------|----------|
| **Fichas de Auror** | Atributos, 40+ perícias com escolas de magia, equipamentos, objetivos pessoais |
| **Rolagem de Atributos** | Modal guiado (3d6×5) para distribuição de atributos na criação da ficha, com reroll forçado |
| **Sistema de Combate** | Rolagem d100, tipos de ataque (Normal, Vulnerável, Assinatura), cálculo de dano e efeitos |
| **Evolução de Perícias** | Marcação automática (ou manual, via clique direito) de perícias aptas a evoluir ao rolar sucesso |
| **Medidor de Estilo** | Ranking D → SSS com bônus progressivos em Magia de Combate |
| **Catálogo de Itens** | 50+ itens organizados por rank (Cadete → SSS) em categorias por tipo, com sistema de carga máxima (FOR ÷ 20) |
| **Campanhas** | Criação de sessões, convites a jogadores, aprovação de candidatos, GM pode criar fichas para jogadores |
| **Escudo do Mestre** | Painel de combate da campanha: iniciativa, turnos e rodadas, edição rápida de HP/Postura/PM/Sorte/Estilo de PCs e NPCs, clonagem de fichas como NPCs transitórios e anotações por combatente |
| **Painel do Mestre** | Visão geral de todos os jogadores registrados e suas fichas |
| **Perfil** | Upload de foto com compressão automática, configurações de conta |
| **Sync em Tempo Real** | Firestore com proteção contra conflito entre múltiplas abas |

---

## Stack

```
Frontend     HTML5 · CSS3 modular · JavaScript vanilla (sem framework)
Auth & DB    Firebase Authentication · Cloud Firestore
Hosting      Firebase Hosting / GitHub Pages
Build        PowerShell (update-version.ps1) para cache busting automático
```

---

## Começando

### Pré-requisitos

- Conta no [Firebase Console](https://console.firebase.google.com/) com projeto criado
- Authentication habilitado (Email/Senha)
- Cloud Firestore habilitado

### Configuração

**1.** Clone o repositório:

```bash
git clone https://github.com/ViniciusFeliciano12/ViniciusFeliciano12.github.io.git
cd ViniciusFeliciano12.github.io
```

**2.** Copie o template de configuração:

```bash
cp rpg-aurores/js/firebase-config.example.js rpg-aurores/js/firebase-config.js
```

**3.** Preencha `rpg-aurores/js/firebase-config.js` com as credenciais do seu projeto Firebase:

```js
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "SEU_ID",
  appId: "SEU_APP_ID"
};
```

**4.** Publique as regras do Firestore:

```bash
firebase deploy --only firestore:rules
```

**5.** Abra `index.html` diretamente no navegador ou sirva localmente com qualquer servidor estático.

---

## Estrutura do Projeto

```
ViniciusFeliciano12.github.io/
├── index.html                   # Página inicial + autenticação
├── style.css                    # Estilos da landing page
├── firestore.rules              # Regras de segurança (Firestore)
├── firebase.json                # Configuração de hosting
├── update-version.ps1           # Cache busting de assets
│
└── rpg-aurores/
    ├── ficha/index.html         # Ficha do personagem
    ├── campanha/index.html      # Lista de campanhas
    ├── campanha/campanha.js     # Lógica de listagem/criação de campanhas
    ├── campanha/detalhes/       # Detalhes de uma campanha
    │   ├── index.html           # Abas: visão geral, membros, Escudo do Mestre
    │   ├── detalhes.js          # Membros, candidatos, vínculo de fichas
    │   └── escudo.js            # Escudo do Mestre (painel de combate da campanha)
    ├── painel/index.html        # Painel do Mestre
    ├── regras/index.html        # Referência de regras de combate d100
    ├── regras-criacao/index.html # Regras de criação de ficha (especializações, patentes, etc.)
    ├── glossario/index.html     # Glossário mágico
    ├── itens/index.html         # Catálogo de itens
    ├── perfil/index.html        # Perfil do usuário
    │
    ├── css/                     # Estilos modulares
    │   ├── base.css             # Variáveis e tipografia globais
    │   ├── sheet.css            # Ficha do personagem
    │   ├── combat.css           # Painel de combate
    │   ├── items.css            # Catálogo de itens
    │   ├── content.css          # Regras e glossário
    │   ├── painel.css           # Painel do Mestre
    │   ├── perfil.css           # Perfil
    │   └── campanha.css         # Campanhas + Escudo do Mestre
    │
    └── js/                      # Módulos JavaScript
        ├── firebase-config.example.js  # ← Template de configuração
        ├── db.js                # Wrapper Firebase (auth + CRUD)
        ├── app.js               # Inicialização principal
        ├── sheet.js             # Renderização da ficha
        ├── skills.js            # Sistema de perícias, escolas e evolução
        ├── combat.js            # Sistema de combate
        ├── attrs-roll.js        # Modal de rolagem de atributos (3d6×5)
        ├── items.js             # Banco de dados de itens
        ├── dice.js              # Rolagem e probabilidades
        ├── header.js            # Componente de cabeçalho
        ├── rules-collapse.js    # Recolhe/expande seções nas páginas de regras/itens
        ├── painel.js            # Lógica do Painel do Mestre
        ├── perfil.js            # Gerenciamento de perfil
        ├── glossario.js         # Filtro de busca do glossário
        ├── storage.js           # Persistência local/sync incremental de fichas
        └── utils.js             # Utilitários gerais
```

---

## Modelo de Permissões

As regras do Firestore implementam acesso em camadas:

- **Jogador** — lê e edita apenas a própria ficha
- **Mestre (GM)** — lê fichas de todos os jogadores de suas campanhas
- **Membro de campanha** — visualiza fichas dos colegas da mesma sessão
- **Candidato** — envia requisição de entrada; GM aprova ou rejeita

---

## Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature: `git checkout -b feature/minha-feature`
3. Configure `firebase-config.js` com seu próprio projeto Firebase
4. Faça commit das suas alterações: `git commit -m 'Adiciona minha feature'`
5. Abra um Pull Request

> **Atenção:** `firebase-config.js` está no `.gitignore` — nunca commite credenciais reais.

---

<div align="center">

*Feito por [Vinicius Feliciano](https://github.com/ViniciusFeliciano12)*

*Que o Ministério da Magia aprove.*

</div>
