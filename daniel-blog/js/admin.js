import { db, auth } from './firebase-config.js';
import { collection, getDocs, addDoc, doc, deleteDoc, updateDoc, getDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Variáveis Globais
let editorInstance;
const postsCache = {}; // Cache para edição rápida

// Elementos do DOM
const loginScreen = document.getElementById('login-screen');
const adminPanel = document.getElementById('admin-panel');
const listSection = document.getElementById('list-section');
const formSection = document.getElementById('form-section');
const formTitle = document.getElementById('form-title');
const form = document.getElementById('post-form');
const btnSave = document.getElementById('btn-save');
const btnToggle = document.getElementById('btn-novo'); // Botão + Novo

// --- 1. INICIALIZAÇÃO (CKEDITOR & AUTH) ---

// Inicia CKEditor
ClassicEditor
	.create(document.querySelector('#conteudo'), {
		toolbar: ['heading', '|', 'bold', 'italic', 'link', 'bulletedList', 'numberedList', 'blockQuote', 'undo', 'redo']
	})
	.then(editor => { editorInstance = editor; })
	.catch(error => { console.error("Erro CKEditor:", error); });

// Monitora Login
onAuthStateChanged(auth, (user) => {
	if (user) {
		loginScreen.style.display = 'none';
		adminPanel.style.display = 'block';
		carregarLista(); // Carrega lista só quando logado
	} else {
		adminPanel.style.display = 'none';
		loginScreen.style.display = 'flex';
	}
});

// --- 2. EVENTOS DE BOTÕES (LISTENERS) ---

// Botão Login
document.getElementById('btn-login').addEventListener('click', () => {
	const email = document.getElementById('email-input').value;
	const pass = document.getElementById('password-input').value;
	const errorMsg = document.getElementById('login-error');
	
	errorMsg.style.display = 'none';

	signInWithEmailAndPassword(auth, email, pass)
		.catch((error) => {
			console.error(error);
			errorMsg.style.display = 'block';
			errorMsg.innerText = "Erro: " + error.code;
		});
});

// Botão Logout
document.getElementById('btn-logout').addEventListener('click', () => {
	signOut(auth);
});

// Botão Novo Artigo
document.getElementById('btn-novo').addEventListener('click', () => {
	abrirFormulario();
});

// Botão Cancelar
document.getElementById('btn-cancelar').addEventListener('click', () => {
	mostrarLista();
});

// --- 3. FUNÇÕES DE TELA ---

function abrirFormulario(id = null) {
	// Se tiver ID, é edição. Se não, é novo.
	if (id) {
		const post = postsCache[id]; // Pega do cache local
		if (!post) return; // Segurança

		document.getElementById('edit-id').value = id;
		document.getElementById('titulo').value = post.titulo;
		document.getElementById('tag').value = post.tag;
		document.getElementById('data').value = post.data;
		document.getElementById('imagem').value = post.imagem;
		document.getElementById('resumo').value = post.resumo;
		if (editorInstance) editorInstance.setData(post.conteudo);

		formTitle.innerText = "Editar Artigo";
		btnSave.innerText = "Atualizar Artigo";
	} else {
		// Modo Novo Artigo
		form.reset();
		document.getElementById('edit-id').value = "";
		document.getElementById('data').valueAsDate = new Date();
		if (editorInstance) editorInstance.setData('');
		
		formTitle.innerText = "Novo Artigo";
		btnSave.innerText = "Publicar Artigo";
	}

	// Troca a tela
	listSection.classList.add('hidden');
	btnToggle.classList.add('hidden'); // Esconde botão + Novo
	formSection.style.display = 'block';
}

function mostrarLista() {
	formSection.style.display = 'none';
	listSection.classList.remove('hidden');
	btnToggle.classList.remove('hidden');
}

// --- 4. CRUD DO FIRESTORE ---

async function carregarLista() {
	const tbody = document.getElementById('posts-table-body');
	const loading = document.getElementById('loading-msg');
	
	tbody.innerHTML = '';
	loading.style.display = 'block';

	try {
		const q = query(collection(db, "artigos"), orderBy("data", "desc"));
		const snapshot = await getDocs(q);
		
		loading.style.display = 'none';

		if (snapshot.empty) {
			loading.innerText = "Nenhum artigo encontrado.";
			loading.style.display = 'block';
			return;
		}

		snapshot.forEach(docSnap => {
			const post = docSnap.data();
			const id = docSnap.id;
			
			// Salva no cache para edição rápida sem nova busca
			postsCache[id] = post;

			let dataFormatada = '-';
			if(post.data) {
				dataFormatada = new Date(post.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
			}

			const tr = document.createElement('tr');
			tr.innerHTML = `
				<td>${dataFormatada}</td>
				<td><strong>${post.titulo}</strong></td>
				<td>${post.tag}</td>
				<td style="text-align: right;">
					<button class="btn btn-edit btn-acao-editar" data-id="${id}">Editar</button>
					<button class="btn btn-danger btn-acao-excluir" data-id="${id}">Excluir</button>
				</td>
			`;
			tbody.appendChild(tr);
		});

		// Adiciona eventos aos botões da tabela (delegar ou loop)
		adicionarEventosTabela();

	} catch (e) {
		console.error(e);
		loading.innerText = "Erro ao carregar lista.";
	}
}

function adicionarEventosTabela() {
	// Botões Editar
	document.querySelectorAll('.btn-acao-editar').forEach(btn => {
		btn.addEventListener('click', (e) => {
			const id = e.target.getAttribute('data-id');
			abrirFormulario(id);
		});
	});

	// Botões Excluir
	document.querySelectorAll('.btn-acao-excluir').forEach(btn => {
		btn.addEventListener('click', async (e) => {
			const id = e.target.getAttribute('data-id');
			if (confirm("Tem certeza que deseja excluir?")) {
				await deleteDoc(doc(db, "artigos", id));
				carregarLista(); // Atualiza tabela
			}
		});
	});
}

// --- 5. SALVAR ---
form.addEventListener('submit', async (e) => {
	e.preventDefault();
	
	const conteudoHTML = editorInstance.getData();
	if (!conteudoHTML) { alert("Conteúdo obrigatório!"); return; }

	btnSave.disabled = true;
	const id = document.getElementById('edit-id').value;
	
	const payload = {
		titulo: document.getElementById('titulo').value,
		tag: document.getElementById('tag').value,
		data: document.getElementById('data').value,
		imagem: document.getElementById('imagem').value,
		resumo: document.getElementById('resumo').value,
		conteudo: conteudoHTML,
		autor: "Daniel"
	};

	try {
		if (id) {
			await updateDoc(doc(db, "artigos", id), payload);
		} else {
			await addDoc(collection(db, "artigos"), payload);
		}
		mostrarLista();
		carregarLista(); // Recarrega para atualizar cache e tabela
	} catch (err) {
		console.error(err);
		alert("Erro ao salvar: " + err.message);
	} finally {
		btnSave.disabled = false;
	}
});