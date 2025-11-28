import { db } from './firebase-config.js';
import { collection, getDocs, addDoc, doc, deleteDoc, updateDoc, getDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let editorInstance;

// Inicializa CKEditor
ClassicEditor
	.create(document.querySelector('#conteudo'), {
		toolbar: [ 'heading', '|', 'bold', 'italic', 'link', 'bulletedList', 'numberedList', 'blockQuote', 'undo', 'redo' ]
	})
	.then(editor => { editorInstance = editor; })
	.catch(error => { console.error(error); });

// --- Autenticação ---
const SENHA_SECRETA = "admin123"; 

window.verificarSenha = function() {
	if (document.getElementById('password-input').value === SENHA_SECRETA) {
		document.getElementById('login-screen').style.display = 'none';
		document.getElementById('admin-panel').style.display = 'block';
		carregarLista(); 
	} else {
		alert("Senha incorreta!");
	}
}

// --- DOM ---
const listSection = document.getElementById('list-section');
const formSection = document.getElementById('form-section');
const btnToggle = document.getElementById('btn-toggle-view');
const formTitle = document.getElementById('form-title');
const btnSave = document.getElementById('btn-save');
const form = document.getElementById('post-form');

// --- UI Functions ---
window.mostrarFormulario = () => {
	form.reset();
	document.getElementById('edit-id').value = ""; 
	if(editorInstance) editorInstance.setData('');
	alternarVisibilidade(true);
	formTitle.innerText = "Novo Artigo";
	btnSave.innerText = "Publicar Artigo";
	document.getElementById('data').valueAsDate = new Date();
};

window.mostrarLista = () => {
	alternarVisibilidade(false);
	carregarLista();
};

function alternarVisibilidade(mostraForm) {
	if (mostraForm) {
		listSection.classList.add('hidden');
		btnToggle.classList.add('hidden');
		formSection.style.display = 'block';
	} else {
		formSection.style.display = 'none';
		listSection.classList.remove('hidden');
		btnToggle.classList.remove('hidden');
	}
}

// --- CRUD ---
async function carregarLista() {
	const tbody = document.getElementById('posts-table-body');
	tbody.innerHTML = '';
	document.getElementById('loading-msg').style.display = 'block';

	const q = query(collection(db, "artigos"), orderBy("data", "desc"));
	const snapshot = await getDocs(q);
	
	document.getElementById('loading-msg').style.display = 'none';

	snapshot.forEach(docSnap => {
		const post = docSnap.data();
		const id = docSnap.id;
		let dataFormatada = new Date(post.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

		const tr = document.createElement('tr');
		tr.innerHTML = `
			<td>${dataFormatada}</td>
			<td><strong>${post.titulo}</strong></td>
			<td>${post.tag}</td>
			<td style="text-align: right;">
				<button class="btn btn-edit" onclick="editarPost('${id}')">Editar</button>
				<button class="btn btn-danger" onclick="excluirPost('${id}')">Excluir</button>
			</td>
		`;
		tbody.appendChild(tr);
	});
}

window.editarPost = async (id) => {
	btnToggle.innerText = "Carregando...";
	const docRef = doc(db, "artigos", id);
	const docSnap = await getDoc(docRef);

	if (docSnap.exists()) {
		const data = docSnap.data();
		document.getElementById('edit-id').value = id;
		document.getElementById('titulo').value = data.titulo;
		document.getElementById('tag').value = data.tag;
		document.getElementById('data').value = data.data;
		document.getElementById('imagem').value = data.imagem;
		document.getElementById('resumo').value = data.resumo;
		if(editorInstance) editorInstance.setData(data.conteudo);

		alternarVisibilidade(true);
		formTitle.innerText = "Editar Artigo";
		btnSave.innerText = "Atualizar Artigo";
	}
	btnToggle.innerText = "+ Novo Artigo";
};

window.excluirPost = async (id) => {
	if (confirm("Tem certeza?")) {
		await deleteDoc(doc(db, "artigos", id));
		carregarLista();
	}
};

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

	if (id) await updateDoc(doc(db, "artigos", id), payload);
	else await addDoc(collection(db, "artigos"), payload);

	btnSave.disabled = false;
	mostrarLista();
});