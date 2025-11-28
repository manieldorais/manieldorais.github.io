import { db } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

async function carregarArtigo() {
	const params = new URLSearchParams(window.location.search);
	const id = params.get('id');
	const container = document.getElementById('article-container');

	if (!id) {
		window.location.href = 'index.html';
		return;
	}

	try {
		const docRef = doc(db, "artigos", id);
		const docSnap = await getDoc(docRef);

		if (docSnap.exists()) {
			const data = docSnap.data();
			document.title = data.titulo + " - Blog";
			
			// Formata data
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
		} else {
			container.innerHTML = '<h2>Artigo não encontrado!</h2>';
		}
	} catch (erro) {
		console.error("Erro:", erro);
	}
}

carregarArtigo();