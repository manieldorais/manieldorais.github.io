document.addEventListener('DOMContentLoaded', () => {
    const storyCards = document.querySelectorAll('.story-card');
    let currentStoryIndex = 0;
    let autoAdvanceTimeout; // Variável para controlar o timeout do avanço automático

    function updateStories() {
        storyCards.forEach((card, index) => {
            card.classList.remove('active', 'prev'); // Remove classes de estado
            if (index === currentStoryIndex) {
                card.classList.add('active'); // Adiciona classe 'active' à história atual
            } else if (index < currentStoryIndex) {
                card.classList.add('prev'); // Adiciona classe 'prev' para histórias que já passaram
            }
        });
        resetAutoAdvance(); // Reinicia o avanço automático ao mudar de história
    }

    function showNextStory() {
        currentStoryIndex = (currentStoryIndex + 1) % storyCards.length;
        updateStories();
    }

    function showPrevStory() {
        currentStoryIndex = (currentStoryIndex - 1 + storyCards.length) % storyCards.length;
        updateStories();
    }

    function resetAutoAdvance() {
        clearTimeout(autoAdvanceTimeout); // Limpa qualquer timeout existente
        const activeProgressBar = storyCards[currentStoryIndex].querySelector('.progress-bar::after');
        if (activeProgressBar) {
            // Reinicia a animação da barra de progresso (CSS)
            activeProgressBar.style.animation = 'none';
            activeProgressBar.offsetHeight; // Força um reflow para reiniciar a animação
            activeProgressBar.style.animation = 'progress 10s linear forwards';
        }
        autoAdvanceTimeout = setTimeout(showNextStory, 10000); // Avança automaticamente após 10 segundos
    }

    // Adiciona event listeners aos botões de navegação
    storyCards.forEach(card => {
        const nextButton = card.querySelector('.next-button');
        const prevButton = card.querySelector('.prev-button');

        if (nextButton) {
            nextButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Impede que o clique se propague para o card (evita problemas com toques)
                showNextStory();
            });
        }
        if (prevButton) {
            prevButton.addEventListener('click', (e) => {
                e.stopPropagation();
                showPrevStory();
            });
        }
    });

    // Adiciona suporte a swipe para mobile
    let touchStartX = 0;
    let touchEndX = 0;

    const mainContainer = document.querySelector('.stories-container');

    mainContainer.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
    }, { passive: true }); // passive: true para otimização de scroll

    mainContainer.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].clientX;
        handleSwipe();
    });

    function handleSwipe() {
        const swipeThreshold = 50; // Pixels para considerar um swipe
        if (touchEndX < touchStartX - swipeThreshold) {
            showNextStory(); // Swipe para a esquerda (próxima história)
        }
        if (touchEndX > touchStartX + swipeThreshold) {
            showPrevStory(); // Swipe para a direita (história anterior)
        }
    }

    // Inicializa a primeira história
    updateStories();
});