import { db } from './firebase-config.js';
import { collection, getDocs, orderBy, query } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

async function carregarArtigos() {
	const container = document.getElementById('lista-artigos');
	
	try {
		const q = query(collection(db, "artigos"), orderBy("data", "desc"));
		const querySnapshot = await getDocs(q);
		
		container.innerHTML = '';

		if (querySnapshot.empty) {
			container.innerHTML = '<p>Nenhum artigo encontrado.</p>';
			return;
		}

		querySnapshot.forEach((doc) => {
			const post = doc.data();
			const id = doc.id;
			let hoje = new Date();
			let dataPost = post.data.toDate();
			let diferencaDias = Math.floor((hoje - dataPost) / (1000 * 60 * 60 * 24));

			if (diferencaDias === 0) {
				post.resumo += ' (Publicado hoje)';
			} else if (diferencaDias === 1) {
				post.resumo += ' (Publicado ontem)';
			} else {
				post.resumo += ` (Publicado há ${diferencaDias} dias)`;
			}
			if(dataPost > hoje){
				return;
			}
			const htmlCard = `
				<article class="card">
					<div class="card-img" style="background-image: url('${post.imagem || 'https://placehold.co/600x400'}');"></div>
					<div class="card-content">
						<span class="tag">${post.tag}</span>
						<h2 class="card-title">${post.titulo}</h2>
						<p class="card-excerpt">${post.resumo}</p>
						<a href="leitura.html?id=${id}" class="read-more">Ler artigo &rarr;</a>
					</div>
				</article>
			`;
			container.innerHTML += htmlCard;
		});

	} catch (erro) {
		console.error("Erro:", erro);
		container.innerHTML = '<p>Erro ao carregar.</p>';
	}
}

// Inicia
carregarArtigos();