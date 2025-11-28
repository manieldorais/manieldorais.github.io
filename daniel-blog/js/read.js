import { db } from './firebase-config.js';
import { doc, getDoc, collection, addDoc, query, where, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const params = new URLSearchParams(window.location.search);
const idArtigo = params.get('id');

// --- 1. FUNÇÃO PARA CARREGAR O ARTIGO E OS COMENTÁRIOS ---
async function carregarArtigo() {
	const container = document.getElementById('article-container');

	if (!idArtigo) {
		window.location.href = 'index.html';
		return;
	}

	try {
		// Carrega o Artigo
		const docRef = doc(db, "artigos", idArtigo);
		const docSnap = await getDoc(docRef);

		if (docSnap.exists()) {
			const data = docSnap.data();
			document.title = data.titulo + " - Blog";
			
			let dataFormatada = new Date(data.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

			container.innerHTML = `
				<header class="article-header">
					<div class="article-meta">
						<span>${dataFormatada}</span> &bull; <span>${data.tag}</span>
					</div>
					<h1 class="article-title">${data.titulo}</h1>
				</header>
				<img src="${data.imagem}" alt="${data.titulo}" class="featured-image">
				<div class="article-content">
					${data.conteudo}
				</div>
			`;
			
			// Carrega os comentários APÓS carregar o artigo
			carregarComentarios(); 

		} else {
			container.innerHTML = '<h2>Artigo não encontrado!</h2>';
		}
	} catch (erro) {
		console.error("Erro:", erro);
	}
}

// --- 2. FUNÇÃO PARA LISTAR COMENTÁRIOS ---
async function carregarComentarios() {
	const listContainer = document.getElementById('comment-list');
	listContainer.innerHTML = 'Carregando comentários...';

	try {
		// A chave é o 'where' para filtrar apenas comentários deste artigo
		const q = query(
			collection(db, "comentarios"),
			where("artigoId", "==", idArtigo),
			orderBy("data", "desc")
		);

		const snapshot = await getDocs(q);
		
		if (snapshot.empty) {
			listContainer.innerHTML = '<p>Nenhum comentário ainda. Seja o primeiro!</p>';
			return;
		}
		
		let comentariosHTML = '';
		snapshot.forEach(docSnap => {
			const c = docSnap.data();
			let dataC = new Date(c.data).toLocaleDateString('pt-BR');
			
			comentariosHTML += `
				<div class="comment-box">
					<div class="comment-meta">
						<strong>${c.nome}</strong>
						<span>Enviado em: ${dataC}</span>
					</div>
					<p>${c.texto}</p>
				</div>
			`;
		});

		listContainer.innerHTML = comentariosHTML;

	} catch (error) {
		console.error("Erro ao carregar comentários:", error);
		listContainer.innerHTML = '<p style="color: red;">Erro ao carregar comentários.</p>';
	}
}

// --- 3. FUNÇÃO PARA SUBMETER NOVO COMENTÁRIO ---
document.getElementById('comment-form').addEventListener('submit', async (e) => {
	e.preventDefault();
	
	const form = e.target;
	const btn = document.getElementById('btn-comentar');
	
	btn.disabled = true;
	btn.innerText = "Enviando...";

	const payload = {
		artigoId: idArtigo,
		nome: form.nome.value,
		email: form.email.value,
		texto: form.comentario.value,
		data: new Date().toISOString(), // Salva data como string ISO
	};
	
	try {
		await addDoc(collection(db, "comentarios"), payload);
		
		alert("Comentário enviado com sucesso!");
		form.reset();
		carregarComentarios(); // Recarrega a lista para mostrar o novo comentário
		
	} catch (error) {
		console.error("Erro ao enviar comentário:", error);
		alert("Houve um erro ao enviar o comentário. Tente novamente.");
	} finally {
		btn.disabled = false;
		btn.innerText = "Enviar Comentário";
	}
});


// Inicia o carregamento
carregarArtigo();