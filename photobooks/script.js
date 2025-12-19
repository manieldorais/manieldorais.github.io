const feed = document.getElementById('feed');
const layouts = ['layout-left', 'layout-right', 'layout-portrait', 'layout-full'];
let currentIndex = 0;

// Função que cria o HTML de cada foto
function createPhotoElement(data) {
	const container = document.createElement('div');
	
	// Sorteia layout aleatório
	const randomStyle = layouts[Math.floor(Math.random() * layouts.length)];
	container.classList.add('photo-entry', randomStyle);

	const img = document.createElement('img');
	img.src = data.src;
	img.loading = "lazy"; // Melhora performance
	img.alt = data.date;
	
	const meta = document.createElement('div');
	meta.classList.add('meta');
	meta.textContent = data.date;

	container.appendChild(img);
	container.appendChild(meta);

	return container;
}

// Carrega um lote de fotos
function loadNextBatch(amount = 2) {
	if (!feed) return; // Segurança caso carregue na página errada

	for (let i = 0; i < amount; i++) {
		// Loop infinito usando módulo (%)
		const data = photoData[currentIndex % photoData.length];
		const photoNode = createPhotoElement(data);
		feed.appendChild(photoNode);

		// Observer: Animação quando entra na tela
		const observer = new IntersectionObserver((entries) => {
			entries.forEach(entry => {
				if (entry.isIntersecting) {
					entry.target.classList.add('visible');
					observer.unobserve(entry.target);
				}
			});
		}, { threshold: 0.1 });
		
		observer.observe(photoNode);
		currentIndex++;
	}
}

// Inicialização (se estivermos numa página de álbum)
if (typeof photoData !== 'undefined' && feed) {
	// Carrega primeiras 3 fotos
	loadNextBatch(3);

	// Evento de Scroll Infinito
	window.addEventListener('scroll', () => {
		if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
			loadNextBatch(2);
		}
	});
}